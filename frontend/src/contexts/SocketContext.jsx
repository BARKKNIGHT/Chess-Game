import { createContext, useContext, useState, useEffect, useRef } from "react";
import { WS_URL } from "../constant";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useGuest } from "./GuestContext";

const SocketContext = createContext();

const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const { user, token , loading:authLoading } = useAuth();
  const { guestId, isGuest, loading: guestLoading } = useGuest();

  useEffect(() => {

    if(authLoading && guestLoading) {
      return;
    }

   

    let authPayload = {};


    if (token && user) {
      authPayload = { token };
    } else if (guestId && isGuest) {
      authPayload = { guestId };
    } else {
      return;
    }

    const handleReconnect = () => {
      reconnectAttempts.current += 1;

    };

    const newSocket = io(WS_URL, {
      transports: ["websocket"],
      auth: { authPayload },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 60000,
    });

    newSocket.on("connect", () => {

      setIsConnected(true);
      reconnectAttempts.current = 0;
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", {
        error: error.message,
        type: error.type,
        description: error.description,
        socketId: newSocket.id,
      });
      setIsConnected(false);
    });

    newSocket.on("disconnect", (reason) => {

      setIsConnected(false);
    });

    newSocket.on("reconnect", (attemptNumber) => {

      handleReconnect();
    });

    newSocket.on("reconnect_attempt", (attemptNumber) => {

    });

    newSocket.on("reconnect_error", (error) => {
 
    });

    newSocket.on("reconnect_failed", () => {
      console.error("Failed to reconnect after all attempts");
      newSocket.disconnect();
    });

    // Handle auth events
    newSocket.on("auth_success", (data) => {
    });

    newSocket.on("auth_error", (data) => {
      newSocket.disconnect();
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token, user, guestId, isGuest , authLoading , guestLoading]);

  const value = {
    socket,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export { useSocket, SocketProvider };
