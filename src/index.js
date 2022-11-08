import http from 'http';
import cluster from 'cluster';
import winston from 'winston';
import net from 'net';
import { runNext } from './next';
import runWS from './ws';
import { LB_PORT, NEXT_PORT, REST_API_PORT } from './constants';
import { proxy } from './reverse-proxy';
import Router from './lib/router';
import { UserController } from './rest/controllers/user.controller';
import { RoomController } from './rest/controllers/room.controller';

const services = {
  NEXT: null,
  REST: null,
};

(async function main() {
  const consoleTransport = new winston.transports.Console();
  const winstonOptions = {
    transports: [consoleTransport],
  };
  const logger = new winston.createLogger(winstonOptions);

  if (cluster.isPrimary || cluster.isMaster) {
    const servicesEntries = Object.entries(services);
    for (let i = 0; i < servicesEntries.length; i += 1) {
      const worker = cluster.fork({ CHILD_PROCESS_NAME: servicesEntries[i][0] });
      worker.on('exit', (code, signal) => {
        if (signal) {
          logger.info(`Worker killed by signal ${signal}`);
        } else if (code !== 0) {
          logger.error(`worker exited with error code: ${code}`);
        } else {
          logger.info('worker success!');
        }
      });
    }

    const tcpServer = net.createServer(proxy);
    tcpServer.on('error', (err) => logger.error(err.message));
    tcpServer.on('close', () => {
      logger.info('connection closed');
    });
    tcpServer.listen({ host: '127.0.0.1', port: LB_PORT }, () => {
      logger.info(`TCP Server is running on ${LB_PORT}`);
    });
  }

  if (process.env.CHILD_PROCESS_NAME === 'NEXT') {
    /** build first to run production version */
    await runNext({ dev: true }, NEXT_PORT);
    logger.info(`NEXT is running on ${NEXT_PORT}`);
  }

  if (process.env.CHILD_PROCESS_NAME === 'REST') {
    const srv = http.createServer(async () => {});
    const router = new Router(srv, '/rest/api');
    router.get('/user', UserController.login);
    router.post('/user', UserController.register);
    router.delete('/user', UserController.delete);
    router.get('/user/rooms', RoomController.getRooms);
    router.post('/room', RoomController.createRoom);
    router.delete('/room', RoomController.deleteRoom);
    router.get('/messages', RoomController.getMessagesInRoom);

    runWS({ server: srv });

    srv.listen(REST_API_PORT, () => {
      logger.info(`REST is running on ${REST_API_PORT}`);
    });
  }
}());
