import { Request, Response } from 'express';
import { createWorker } from '../lib/noti.queue';

const clients = new Map<string, Response[]>();

export const subscribeEventCtrl = async (req: Request, res: Response) => {
  const notiId = req.uid!;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write('\n'); // Send initial empty line to establish connection

  if (!clients.has(notiId)) {
    clients.set(notiId, []);
  }
  clients.get(notiId)?.push(res);

  req.on('close', () => {
    clients.set(notiId, clients.get(notiId)?.filter(client => client !== res) || []);
    if (clients.get(notiId)?.length === 0) {
      clients.delete(notiId);
    }
  });
}

export const initNotiEventWorker = () => createWorker(async (job) => {
  const { notiId, eventType, data } = job.data;
  console.log(`Processing notification job for user ${notiId}, event: ${eventType}`);

  const userClients = clients.get(notiId);
  if (userClients) {
    userClients.forEach(clientRes => {
      clientRes.write(`event: ${eventType}\n`);
      clientRes.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
});
