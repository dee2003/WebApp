# /backend/websocket_manager.py

import asyncio
import json
from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # Stores active connections: {foreman_id: WebSocket}
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, foreman_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[foreman_id] = websocket

    def disconnect(self, foreman_id: int):
        if foreman_id in self.active_connections:
            del self.active_connections[foreman_id]

    async def send_personal_message(self, foreman_id: int, message_data: dict):
        if foreman_id in self.active_connections:
            websocket = self.active_connections[foreman_id]
            await websocket.send_text(json.dumps(message_data))

# Create a single, shared instance
manager = ConnectionManager()