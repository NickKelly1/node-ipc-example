import { Socket } from "node:net";

export interface IPCClient {
    /**
     * triggered when a JSON message is received. The event name will be the type string from your message
     * and the param will be the data object from your message eg : { type:'myEvent',data:{a:1}}
     */
    on(event: string, callback: (...args: any[]) => void): IPCClient;
    /**
     * triggered when an error has occured
     */
    on(event: "error", callback: (err: any) => void): IPCClient;
    /**
     * connect - triggered when socket connected
     * disconnect - triggered by client when socket has disconnected from server
     * destroy - triggered when socket has been totally destroyed, no further auto retries will happen and all references are gone
     */
    on(event: "connect" | "disconnect" | "destroy", callback: () => void): IPCClient;
    /**
     * triggered by server when a client socket has disconnected
     */
    on(event: "socket.disconnected", callback: (socket: Socket, destroyedSocketID: string) => void): IPCClient;
    /**
     * triggered when ipc.config.rawBuffer is true and a message is received
     */
    on(event: "data", callback: (buffer: Buffer) => void): IPCClient;
    emit(event: string, value?: any): IPCClient;
    /**
     * Unbind subscribed events
     */
    off(event: string, handler: any): IPCClient;
}

export interface IPCSocketConfig {
    address?: string | undefined;
    port?: number | undefined;
}

export interface IPCServer extends IPCClient {
    /**
     * start serving need top call serve or serveNet first to set up the server
     */
    start(): void;
    /**
     * close the server and stop serving
     */
    stop(): void;
    emit(value: any): IPCClient;
    emit(event: string, value: any): IPCClient;
    emit(socket: Socket | IPCSocketConfig, event: string, value?: any): IPCServer;
    emit(socketConfig: Socket | IPCSocketConfig, value?: any): IPCServer;
    broadcast(event: string, value?: any): IPCClient;
}
