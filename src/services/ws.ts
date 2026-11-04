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

  private currentSubject: string | null = null;
  private currentTgId: number | null = null;

  private isUserReconnecting = false;
  private isRoomReconnecting = false;
  private status: ConnectionStatus = "disconnected";

  private getWsUrl(path: string): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}${path}`;
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
    if (this.currentTgId === tgId && this.userWs && this.userWs.readyState === WebSocket.OPEN) {
      return;
    }

    this.currentTgId = tgId;
    this.disconnectUser();
    this.setStatus("connecting");

    try {
      const url = this.getWsUrl(`/ws/user/${tgId}`);
      this.userWs = new WebSocket(url);

      this.userWs.onopen = () => {
        this.isUserReconnecting = false;
        this.setStatus("connected");
        this.startHeartbeat("user");
      };

      this.userWs.onmessage = (event) => {
        try {
          const data: UserWsMessage = JSON.parse(event.data);
          this.userListeners.forEach((listener) => listener(data));
        } catch {
          // heartbeat or unparsed string
        }
      };

      this.userWs.onclose = () => {
        this.stopHeartbeat("user");
        this.setStatus("disconnected");
        if (this.currentTgId && !this.isUserReconnecting) {
          this.isUserReconnecting = true;
          this.setStatus("connecting");
          setTimeout(() => {
            if (this.currentTgId) this.connectUser(this.currentTgId);
          }, 3000);
        }
      };

      this.userWs.onerror = () => {
        this.setStatus("disconnected");
        this.userWs?.close();
      };
    } catch (err) {
      console.warn("User WebSocket connect error:", err);
      this.setStatus("disconnected");
    }
  }

  public disconnectUser() {
    this.stopHeartbeat("user");
    if (this.userWs) {
      this.userWs.onclose = null;
      this.userWs.close();
      this.userWs = null;
    }
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
    if (this.currentSubject === subject && this.queueWs && this.queueWs.readyState === WebSocket.OPEN) {
      return;
    }

    this.currentSubject = subject;
    this.disconnectRoom();

    try {
      const url = this.getWsUrl(`/ws/queue/${encodeURIComponent(subject)}`);
      this.queueWs = new WebSocket(url);

      this.queueWs.onopen = () => {
        this.isRoomReconnecting = false;
        this.startHeartbeat("room");
      };

      this.queueWs.onmessage = (event) => {
        try {
          const data: RoomWsMessage = JSON.parse(event.data);
          this.roomListeners.forEach((listener) => listener(data));
        } catch {
          // heartbeat or unparsed string
        }
      };

      this.queueWs.onclose = () => {
        this.stopHeartbeat("room");
        if (this.currentSubject && !this.isRoomReconnecting) {
          this.isRoomReconnecting = true;
          setTimeout(() => {
            if (this.currentSubject) this.connectRoom(this.currentSubject);
          }, 3000);
        }
      };

      this.queueWs.onerror = () => {
        this.queueWs?.close();
      };
    } catch (err) {
      console.warn("Room WebSocket connect error:", err);
    }
  }

  public disconnectRoom() {
    this.stopHeartbeat("room");
    if (this.queueWs) {
      this.queueWs.onclose = null;
      this.queueWs.close();
      this.queueWs = null;
    }
  }

  public onRoomEvent(listener: RoomListener) {
    this.roomListeners.add(listener);
    return () => {
      this.roomListeners.delete(listener);
    };
  }

  // ──────────────────── Heartbeat (ping/pong) ────────────────────

  private startHeartbeat(type: "user" | "room") {
    if (type === "user") {
      this.stopHeartbeat("user");
      this.userPingInterval = setInterval(() => {
        if (this.userWs && this.userWs.readyState === WebSocket.OPEN) {
          this.userWs.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
    } else {
      this.stopHeartbeat("room");
      this.roomPingInterval = setInterval(() => {
        if (this.queueWs && this.queueWs.readyState === WebSocket.OPEN) {
          this.queueWs.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
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
