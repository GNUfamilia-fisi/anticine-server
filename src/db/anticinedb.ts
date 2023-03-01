/**
 * API de typescript para la base de datos AnticineDB
 *
 * https://github.com/GNUfamilia-fisi/anticine-db
 * @author GNUfamilia-fisi
 */

import net from 'node:net';

type DBResponse = {
  status: 'ok' | 'error';
  data: Object | null;
}

interface IAnticineDB {
  connect: (port: number, host: string) => Promise<void>;

  get: (key: string) => Promise<DBResponse>;

  set: (key: string, value: Object) => Promise<void>;
}

export class AnticineDB implements IAnticineDB {
  private socket: net.Socket;
  private connected: Promise<boolean>;

  constructor() {
    this.socket = new net.Socket();
    this.socket.setEncoding('utf8');

    this.connected = new Promise((resolve) => {
      this.socket.on('connect', () => {
        resolve(true);
      });

      this.socket.on('error', () => {
        resolve(false);
      });

      this.socket.on('close', () => {
        resolve(false);
      });
    });
  }

  async connect(port: number, host: string = 'localhost'): Promise<void> {
    this.socket.connect(port, host);
    let connected = await this.connected;
    if (!connected) {
      throw new Error('Connection failed');
    }
  }

  async get(key: string): Promise<DBResponse> {
    // listen for the response
    return new Promise((resolve, reject) => {
      this.socket.write(`GET ${key}`, (e) => {
        if (e) {
          reject(new Error(e.message));
        }
      });
      this.socket.once('data', (data) => {
        const response = data.toString();
        if (response === 'not found') {
          resolve({
            status: 'error', data: null
          });
          return;
        }
        let json_data: Object;
        try {
          json_data = JSON.parse(response);
          resolve({
            status: 'ok',
            data: json_data
          });
        }
        catch (_) {
          reject({
            status: 'error',
            data: null
          })
        }
      });
    });
  }

  async set(key: string, value: Object): Promise<void> {
    // this.socket.write(`SET ${key} ${JSON.stringify(value)}`);
    return new Promise((resolve, reject) => {
      this.socket.write(`SET ${key} ${JSON.stringify(value)}\r\n`, (e) => {
        if (e) {
          reject(new Error(e.message));
        }
        resolve();
      });
    });
  }
}
