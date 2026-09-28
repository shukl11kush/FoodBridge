import json
from datetime import datetime
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Claim, ChatMessage, User
from app.auth.jwt import get_current_user, decode_access_token
from app.schemas.schemas import ChatMessageCreate, ChatMessageResponse, ChatMessageListResponse

router = APIRouter(prefix="/api/v1", tags=["Chat"])

# Connection Manager for WebSockets
class ConnectionManager:
    def __init__(self):
        # claim_id -> list of WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, claim_id: int, websocket: WebSocket):
        await websocket.accept()
        if claim_id not in self.active_connections:
            self.active_connections[claim_id] = []
        self.active_connections[claim_id].append(websocket)

    def disconnect(self, claim_id: int, websocket: WebSocket):
        if claim_id in self.active_connections:
            if websocket in self.active_connections[claim_id]:
                self.active_connections[claim_id].remove(websocket)

    async def broadcast(self, claim_id: int, message: dict):
        if claim_id in self.active_connections:
            for connection in self.active_connections[claim_id]:
                await connection.send_text(json.dumps(message))

manager = ConnectionManager()

@router.post("/chats/{claim_id}/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_chat_message(
    claim_id: int,
    req: ChatMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    sender_type = "RESTAURANT" if user.user_type == "RESTAURANT" else "SHELTER"

    msg = ChatMessage(
        claim_id=claim_id,
        sender_id=user.user_id,
        sender_type=sender_type,
        message_text=req.message_text,
        sent_at=datetime.utcnow()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    payload = {
        "message_id": msg.message_id,
        "claim_id": msg.claim_id,
        "sender_id": msg.sender_id,
        "sender_type": msg.sender_type,
        "message_text": msg.message_text,
        "sent_at": msg.sent_at.isoformat()
    }

    # Broadcast to WebSocket subscribers
    await manager.broadcast(claim_id, payload)

    return ChatMessageResponse(
        message_id=msg.message_id,
        claim_id=msg.claim_id,
        sender_id=msg.sender_id,
        sender_type=msg.sender_type,
        message_text=msg.message_text,
        sent_at=msg.sent_at,
        read_at=msg.read_at
    )

@router.get("/chats/{claim_id}/messages", response_model=ChatMessageListResponse)
def get_chat_history(
    claim_id: int,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chat not available for this listing"
        )

    query = db.query(ChatMessage).filter(ChatMessage.claim_id == claim_id)
    total = query.count()
    messages = query.order_by(ChatMessage.sent_at.asc()).offset(offset).limit(limit).all()

    items = [
        ChatMessageResponse(
            message_id=m.message_id,
            claim_id=m.claim_id,
            sender_id=m.sender_id,
            sender_type=m.sender_type,
            message_text=m.message_text,
            sent_at=m.sent_at,
            read_at=m.read_at
        )
        for m in messages
    ]

    return ChatMessageListResponse(messages=items, total=total)

@router.put("/chats/{message_id}/mark-read", response_model=ChatMessageResponse)
def mark_message_read(
    message_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(ChatMessage).filter(ChatMessage.message_id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    msg.read_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    return ChatMessageResponse(
        message_id=msg.message_id,
        claim_id=msg.claim_id,
        sender_id=msg.sender_id,
        sender_type=msg.sender_type,
        message_text=msg.message_text,
        sent_at=msg.sent_at,
        read_at=msg.read_at
    )

@router.websocket("/ws/chats/{claim_id}")
async def websocket_chat_endpoint(websocket: WebSocket, claim_id: int, token: str = Query(...)):
    try:
        payload = decode_access_token(token)
        sender_id = payload.get("user_id")
        user_type = payload.get("user_type")
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(claim_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast raw text message or handle structure
            event = {
                "claim_id": claim_id,
                "sender_id": sender_id,
                "sender_type": user_type,
                "message_text": data,
                "sent_at": datetime.utcnow().isoformat()
            }
            await manager.broadcast(claim_id, event)
    except WebSocketDisconnect:
        manager.disconnect(claim_id, websocket)
