import { RoomWsMessage, UserWsMessage } from "@/types";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";
type StatusListener = (status: ConnectionStatus) => void;
type RoomListener = (msg: RoomWsMessage) => void;
type UserListener = (msg: UserWsMessage) => void;

class WebSocketClient {
  private userWs: WebSocket | null = null;
  private queueWs: WebSocket | null = null;

  private userListeners = new Set<UserListener>();
  private roomListeners = new Set<RoomListener>();
  private statusListeners = new Set<StatusListener>();

  private userPingInterval: ReturnType<typeof setInterval> | null = null;
  private roomPingInterval: ReturnType<typeof setInterval> | null = null;
  private userReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private roomReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private currentSubject: string | null = null;
  private currentTgId: number | null = null;
  private status: ConnectionStatus = "disconnected";

  private getWsUrl(path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    let baseWs = "";
    // 1. Explicit WS Base URL if configured
    const wsBase = import.meta.env.VITE_WS_BASE_URL;
    if (wsBase) {
      baseWs = wsBase.replace(/\/+$/, "");
    } else {
      // 2. Derive from API Base URL if configured
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      if (apiBase) {
        try {
          const url = new URL(apiBase, window.location.href);
          const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
          baseWs = `${wsProtocol}//${url.host}`;
        } catch {
          // Fallback to window.location
        }
      }
    }

    // 3. Fallback to same-origin
    if (!baseWs) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      baseWs = `${protocol}//${window.location.host}`;
    }

    let fullUrl = `${baseWs}${cleanPath}`;

    // Security check: if current page is on HTTPS, browsers block insecure ws://
    if (window.location.protocol === "https:" && fullUrl.startsWith("ws://")) {
      fullUrl = fullUrl.replace(/^ws:\/\//, "wss://");
    }

    return fullUrl;
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => listener(newStatus));
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public onStatusChange(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  // ──────────────────── Personal User Socket ────────────────────

  public connectUser(tgId: number) {
    if (this.currentTgId === tgId && this.userWs && (this.userWs.readyState === WebSocket.OPEN || this.userWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.currentTgId = tgId;
    this.cleanupUserSocket();
    this.setStatus("connecting");

    try {
      const url = this.getWsUrl(`/ws/user/${tgId}`);
      const ws = new WebSocket(url);
      this.userWs = ws;

      ws.onopen = () => {
        if (this.userWs !== ws) return;
        this.clearUserReconnectTimer();
        this.setStatus("connected");
        this.startHeartbeat("user");
      };

      ws.onmessage = (event) => {
        try {
          const data: UserWsMessage = JSON.parse(event.data);
          this.userListeners.forEach((listener) => listener(data));
        } catch {
          // heartbeat or unparsed string
        }
      };

      ws.onclose = () => {
        if (this.userWs !== ws) return;
        this.stopHeartbeat("user");
        this.setStatus("disconnected");
        this.scheduleUserReconnect();
      };

      ws.onerror = () => {
        if (this.userWs !== ws) return;
        this.setStatus("disconnected");
        try {
          ws.close();
        } catch {
          // already closed
        }
      };
    } catch (err) {
      console.warn("User WebSocket connect error:", err);
      this.setStatus("disconnected");
      this.scheduleUserReconnect();
    }
  }

  private scheduleUserReconnect() {
    this.clearUserReconnectTimer();
    if (!this.currentTgId) return;

    this.userReconnectTimer = setTimeout(() => {
      this.userReconnectTimer = null;
      if (this.currentTgId) {
        this.connectUser(this.currentTgId);
      }
    }, 3000);
  }

  private clearUserReconnectTimer() {
    if (this.userReconnectTimer) {
      clearTimeout(this.userReconnectTimer);
      this.userReconnectTimer = null;
    }
  }

  private cleanupUserSocket() {
    this.stopHeartbeat("user");
    this.clearUserReconnectTimer();
    if (this.userWs) {
      this.userWs.onopen = null;
      this.userWs.onclose = null;
      this.userWs.onerror = null;
      this.userWs.onmessage = null;
      try {
        this.userWs.close();
      } catch {
        // ignore
      }
      this.userWs = null;
    }
  }

  public disconnectUser() {
    this.currentTgId = null;
    this.cleanupUserSocket();
    this.setStatus("disconnected");
  }

  public onUserEvent(listener: UserListener) {
    this.userListeners.add(listener);
    return () => {
      this.userListeners.delete(listener);
    };
  }

  // ──────────────────── Room Queue Socket ────────────────────

  public connectRoom(subject: string) {
    if (this.currentSubject === subject && this.queueWs && (this.queueWs.readyState === WebSocket.OPEN || this.queueWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.currentSubject = subject;
    this.cleanupRoomSocket();

    try {
      const url = this.getWsUrl(`/ws/queue/${encodeURIComponent(subject)}`);
      const ws = new WebSocket(url);
      this.queueWs = ws;

      ws.onopen = () => {
        if (this.queueWs !== ws) return;
        this.clearRoomReconnectTimer();
        this.startHeartbeat("room");
      };

      ws.onmessage = (event) => {
        try {
          const data: RoomWsMessage = JSON.parse(event.data);
          this.roomListeners.forEach((listener) => listener(data));
        } catch {
          // heartbeat or unparsed string
        }
      };

      ws.onclose = () => {
        if (this.queueWs !== ws) return;
        this.stopHeartbeat("room");
        this.scheduleRoomReconnect();
      };

      ws.onerror = () => {
        if (this.queueWs !== ws) return;
        try {
          ws.close();
        } catch {
          // already closed
        }
      };
    } catch (err) {
      console.warn("Room WebSocket connect error:", err);
      this.scheduleRoomReconnect();
    }
  }

  private scheduleRoomReconnect() {
    this.clearRoomReconnectTimer();
    if (!this.currentSubject) return;

    this.roomReconnectTimer = setTimeout(() => {
      this.roomReconnectTimer = null;
      if (this.currentSubject) {
        this.connectRoom(this.currentSubject);
      }
    }, 3000);
  }

  private clearRoomReconnectTimer() {
    if (this.roomReconnectTimer) {
      clearTimeout(this.roomReconnectTimer);
      this.roomReconnectTimer = null;
    }
  }

  private cleanupRoomSocket() {
    this.stopHeartbeat("room");
    this.clearRoomReconnectTimer();
    if (this.queueWs) {
      this.queueWs.onopen = null;
      this.queueWs.onclose = null;
      this.queueWs.onerror = null;
      this.queueWs.onmessage = null;
      try {
        this.queueWs.close();
      } catch {
        // ignore
      }
      this.queueWs = null;
    }
  }

  public disconnectRoom() {
    this.currentSubject = null;
    this.cleanupRoomSocket();
  }

  public onRoomEvent(listener: RoomListener) {
    this.roomListeners.add(listener);
    return () => {
      this.roomListeners.delete(listener);
    };
  }

  // ──────────────────── Foreground & Reconnect Trigger ────────────────────

  public reconnectIfDisconnected() {
    if (this.currentTgId && (!this.userWs || this.userWs.readyState === WebSocket.CLOSED || this.userWs.readyState === WebSocket.CLOSING)) {
      this.connectUser(this.currentTgId);
    }
    if (this.currentSubject && (!this.queueWs || this.queueWs.readyState === WebSocket.CLOSED || this.queueWs.readyState === WebSocket.CLOSING)) {
      this.connectRoom(this.currentSubject);
    }
  }

  // ──────────────────── Heartbeat (ping/pong) ────────────────────

  private startHeartbeat(type: "user" | "room") {
    if (type === "user") {
      this.stopHeartbeat("user");
      this.userPingInterval = setInterval(() => {
        if (this.userWs && this.userWs.readyState === WebSocket.OPEN) {
          try {
            this.userWs.send(JSON.stringify({ type: "ping" }));
          } catch {
            // failed send
          }
        }
      }, 20000);
    } else {
      this.stopHeartbeat("room");
      this.roomPingInterval = setInterval(() => {
        if (this.queueWs && this.queueWs.readyState === WebSocket.OPEN) {
          try {
            this.queueWs.send(JSON.stringify({ type: "ping" }));
          } catch {
            // failed send
          }
        }
      }, 20000);
    }
  }

  private stopHeartbeat(type: "user" | "room") {
    if (type === "user" && this.userPingInterval) {
      clearInterval(this.userPingInterval);
      this.userPingInterval = null;
    }
    if (type === "room" && this.roomPingInterval) {
      clearInterval(this.roomPingInterval);
      this.roomPingInterval = null;
    }
  }
}

export const wsService = new WebSocketClient();
