import * as dgram from 'dgram'
import * as net from 'net'
import * as tls from 'tls'

export interface CastDevice {
  id: string
  name: string
  ip: string
  port: number
}

const MDNS_ADDRESS = '224.0.0.251'
const MDNS_PORT = 5353
const CAST_QUERY = Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x0c, 0x5f, 0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x63, 0x61, 0x73, 0x74,
  0x04, 0x5f, 0x74, 0x63, 0x70, 0x05, 0x6c, 0x6f, 0x63, 0x61, 0x6c, 0x00,
  0x00, 0x0c, 0x00, 0x01
])

export function discoverCastDevices(timeout = 5000): Promise<CastDevice[]> {
  return new Promise((resolve) => {
    const devices: Map<string, CastDevice> = new Map()
    let socket: dgram.Socket | null = null

    try {
      socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

      socket.on('error', () => resolve([...devices.values()]))

      socket.on('message', (msg, rinfo) => {
        try {
          const text = msg.toString('utf8', 0, Math.min(msg.length, 200))
          const nameMatch = text.match(/([A-Za-z0-9\s\-_'\.]+)\._googlecast/)
          const name = nameMatch ? nameMatch[1].trim() : `Chromecast (${rinfo.address})`
          const id = rinfo.address + ':8009'
          if (!devices.has(id)) {
            devices.set(id, { id, name, ip: rinfo.address, port: 8009 })
          }
        } catch {}
      })

      socket.bind(() => {
        try {
          socket?.addMembership(MDNS_ADDRESS)
          socket?.send(CAST_QUERY, 0, CAST_QUERY.length, MDNS_PORT, MDNS_ADDRESS)
        } catch {}
      })

      setTimeout(() => {
        try { socket?.close() } catch {}
        resolve([...devices.values()])
      }, timeout)
    } catch {
      resolve([])
    }
  })
}

// Basic Chromecast CASTV2 protocol implementation
export function castToDevice(device: CastDevice, streamUrl: string, channelName: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect(device.port, device.ip, { rejectUnauthorized: false }, () => {
        const connectMsg = buildCastMessage('sender-0', 'receiver-0',
          'urn:x-cast:com.google.cast.tp.connection',
          JSON.stringify({ type: 'CONNECT' }))
        socket.write(connectMsg)

        setTimeout(() => {
          const launchMsg = buildCastMessage('sender-0', 'receiver-0',
            'urn:x-cast:com.google.cast.receiver',
            JSON.stringify({ type: 'LAUNCH', appId: 'CC1AD845', requestId: 1 }))
          socket.write(launchMsg)
        }, 500)

        setTimeout(() => {
          const loadMsg = buildCastMessage('client-17558', 'destination-17558',
            'urn:x-cast:com.google.cast.media',
            JSON.stringify({
              type: 'LOAD',
              requestId: 2,
              media: {
                contentId: streamUrl,
                streamType: 'LIVE',
                contentType: streamUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
                metadata: { type: 0, title: channelName }
              },
              autoplay: true
            }))
          socket.write(loadMsg)
          resolve(true)
          setTimeout(() => { try { socket.destroy() } catch {} }, 2000)
        }, 2000)
      })

      socket.on('error', () => resolve(false))
      socket.setTimeout(10000, () => { socket.destroy(); resolve(false) })
    } catch {
      resolve(false)
    }
  })
}

function buildCastMessage(sourceId: string, destinationId: string, namespace: string, payload: string): Buffer {
  const srcBuf = Buffer.from(sourceId, 'utf8')
  const dstBuf = Buffer.from(destinationId, 'utf8')
  const nsBuf = Buffer.from(namespace, 'utf8')
  const payBuf = Buffer.from(payload, 'utf8')

  const msgLen = 2 + 4 + srcBuf.length + 2 + 4 + dstBuf.length + 2 + 4 + nsBuf.length + 2 + 1 + 2 + 4 + payBuf.length
  const msg = Buffer.alloc(4 + msgLen)
  let offset = 0

  msg.writeUInt32BE(msgLen, offset); offset += 4
  // protocol_version = 0
  msg.writeUInt8(0x08, offset++); msg.writeUInt8(0x00, offset++)
  // source_id
  msg.writeUInt8(0x12, offset++); msg.writeUInt8(srcBuf.length, offset++)
  srcBuf.copy(msg, offset); offset += srcBuf.length
  // destination_id
  msg.writeUInt8(0x1a, offset++); msg.writeUInt8(dstBuf.length, offset++)
  dstBuf.copy(msg, offset); offset += dstBuf.length
  // namespace
  msg.writeUInt8(0x22, offset++); msg.writeUInt8(nsBuf.length, offset++)
  nsBuf.copy(msg, offset); offset += nsBuf.length
  // payload_type = STRING (0)
  msg.writeUInt8(0x28, offset++); msg.writeUInt8(0x00, offset++)
  // payload_utf8
  msg.writeUInt8(0x32, offset++); msg.writeUInt8(payBuf.length, offset++)
  payBuf.copy(msg, offset)

  return msg
}
