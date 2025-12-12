# /backend/websocket_manager.py

import asyncio
import json
from fastapi import WebSocket
from typing import Dict

class ConnectionManager:
    def __init__(self):
        # Stores active connections: {foreman_id: WebSocket}
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, foreman_id: int, websocket: WebSocket):
        await websocket.accept()
        # Overwrite any existing connection for this user (Single Device Policy)
        # If you want multiple devices, you'd need a List[WebSocket] here.
        self.active_connections[foreman_id] = websocket
        print(f"✅ Manager: Foreman {foreman_id} connected.")

    def disconnect(self, foreman_id: int, websocket: WebSocket):
        # CRITICAL CHANGE: Only delete if the socket matches the stored one.
        # This prevents a "disconnect" from an old session deleting a "connect" from a new session.
        if foreman_id in self.active_connections:
            if self.active_connections[foreman_id] == websocket:
                del self.active_connections[foreman_id]
                print(f"❌ Manager: Foreman {foreman_id} disconnected.")

    async def send_personal_message(self, foreman_id: int, message_data: dict):
        if foreman_id in self.active_connections:
            websocket = self.active_connections[foreman_id]
            try:
                await websocket.send_text(json.dumps(message_data))
            except Exception as e:
                print(f"⚠️ Error sending message to {foreman_id}: {e}")
                # Optional: clean up dead connection
                # self.disconnect(foreman_id, websocket)

# Create a single, shared instance
manager = ConnectionManager()