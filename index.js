const EventEmitter = require('events')
class UdpResponderEmitter extends EventEmitter {}

const udp = require('dgram')
const crypto = require('crypto')

const defaultOptions = {
  multicast_addr: '224.1.1.1',
  port: 6811,
  ttl: 5000,
  secret: 'CHANGEME'
}

class UdpResponderRejection extends Error {
  constructor ({code, message}) {
    super('UdpResponderRejection\n\n' + message + '\n\n' + JSON.stringify(arguments[0], null, 2))

    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;

    this.code = code || 'UNKNOWN'
    this.message = message || 'No message was provided'
  }
}

class UdpResponderError extends Error {
  constructor ({code, message}) {
    super('UdpResponderError\n\n' + message + '\n\n' + JSON.stringify(arguments[0], null, 2))

    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;

    this.code = code || 'UNKNOWN'
    this.message = message || 'No message was provided'
  }
}

const sign = (secret, data) =>
  crypto.createHmac('sha256', secret)
   .update(data)
   .digest('hex')

class UdpResponder {
  constructor (options = {}) {
    this.options = Object.assign({}, defaultOptions, options)

    if (this.options.secret === 'CHANGEME') {
      console.warn('The `secret` property is still set to the default of `${this.options.secret}` and is therefore insecure.')
    }

    this._eventEmitter = new UdpResponderEmitter()

    this._listener = udp.createSocket({type: 'udp4', reuseAddr: true})
    this._sender = udp.createSocket({type: 'udp4', reuseAddr: true})
  }

  _send (cmd, data, addr, port) {
    if (!cmd) {
      throw new UdpResponderError({
        code: 'COMMAND_EMPTY',
        message: `You must specify a command when sending a message`
      })
    }

    const type = (data instanceof Object ? 'json' : 'text')
    if (type === 'json') {
      data = JSON.stringify(data)  
    }

    const signedDate = `${new Date().getTime()}|${type}|${data}`
    data = `${cmd}|${sign(this.options.secret, signedDate)}|${signedDate}`

    this._sender.send(data, 0, data.length, port || this.options.port, addr || this.options.multicast_addr)
  }

  on (event, fn) {
    return this._eventEmitter.on(event, fn)
  }

  open () {
    this._listener.bind(this.options.port, this.options.multicast_addr, () => {
      this._listener.addMembership(this.options.multicast_addr)
      this._listener.setBroadcast(true)
      this._eventEmitter.emit('opened')
    })

    this._listener.on('message', (msg, sender) => {
      try {
        msg = msg.toString().trim().split('|')
        msg.push(msg.splice(4).join(' '))
        msg = {
          command: msg[0],
          signature: msg[1],
          timestamp: msg[2],
          type: msg[3],
          value: msg[4]
        }

        if (msg.signature !== sign(this.options.secret, `${msg.timestamp}|${msg.type}|${msg.value}`)) {
          throw new UdpResponderRejection({
            code: 'INVALID_SIGNATURE',
            message: 'Message received but had invalid signature.'
          })
        }

        if (new Date().getTime() - msg.timestamp > this.options.ttl) {
          const msFromExpired = (new Date().getTime() - msg.timestamp) - this.options.ttl
          throw new UdpResponderRejection({
            code: 'EXPIRED',
            message: `Message received but expired ${msFromExpired} milliseconds ago.`
          })
        }

        if (!['text', 'json'].includes(msg.type)) {
          throw new UdpResponderRejection({
            code: 'UNKNOWN_DATA_TYPE',
            message: `Message received but the data type of ${msg.type} is unimplemented.`
          })
        }

        if (msg.type === 'json') {
          try {
            msg.value = JSON.parse(msg.value)
          } catch (err) {
            throw new UdpResponderRejection({
              code: 'INVALID_DATA_TYPE',
              message: `Message received with invalid JSON content and could not be parsed.`
            })
          }
        }

        this._eventEmitter.emit('message', msg, sender)
      } catch (err) {
        if (err.constructor.name === 'UdpResponderError') {
          if (this._eventEmitter.listenerCount('error') > 0) {
            this._eventEmitter.emit('error', err, msg, sender)
          } else {
            throw err
          }
        } else if (err.constructor.name === 'UdpResponderRejection') {
          this._eventEmitter.emit('error', err, msg, sender)
        }
      }
    })
  }

  close () {
    this._sender.close()
    this._listener.close()
    this._eventEmitter.emit('closed')
  }

  broadcast (cmd, data) {
    this._send(cmd, data)
  }
}

module.exports = UdpResponder
