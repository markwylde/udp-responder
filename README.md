# Udp Responder
This library lets you broadcast and listen to messages on a network through UDP.

It can validate a message was sent untampered at a certain time by using SHA256 hashing.

## How to use
The library is a class and therefore should be used to create a new object 

### UdpResponder
The `UdpResponder` class can take the following options

Property       | Description                                           | Type                | Required | Default
---------------|-------------------------------------------------------|---------------------|----------|------------
multicast_addr | The address the UDP command receiver will listen on   | string              | false    | 224.1.1.1
port           | The port the UDP command receiver will listen on      | number              | false    | 6811
secure         | Whether to sign and/or encrypt messages sent/received | none, sign, encrypt | false    | sign
secret         | If using secure specify the sha256 signature secret   | string              | false    | CHANGEME
ttl            | If using secure the time until a message expires      | integer             | false    | 5000

The `UdpResponder` class exposes the following methods and properties.

#### UdpResponder::on(event:string, fn:function)
Add an event listener. The following events can occur.

##### opened
```javascript
udpResponder.on('opened', function () {
  console.log('The sender and listener have been opened')
})
```

##### closed
```javascript
udpResponder.on('closed', function () {
  console.log('The sender and listener have been closed')
})
```

##### message
When a message is received it will have a command and possible some data.

The sender is "Remote address information" provided as `rinfo` from the node API.
[https://nodejs.org/api/dgram.html#dgram_event_message](https://nodejs.org/api/dgram.html#dgram_event_message)

```javascript
udpResponder.on('message', function (cmd, data, sender) {
  console.log(`A new ${cmd} message has been received of:`, data)
})
```

##### error
```javascript
udpResponder.on('error', function (error, cmd, data, sender) {
  console.log(`An error occured:`, err)
})
```

#### Security Level
There is a `secure` option that can be set when creating a new instance. It accepts the following options.
##### none
- :white_check_mark: Accept receiving unsigned messages
- :x: Accept receiving signed messages
- :x: Accept receiving encrypted messages
- :white_check_mark: Messages sent will be unsigned and not encrypted
- :x: Messages sent will be signed but not encrypted
- :x: Messages sent will be signed and encrypted

##### sign
- :x: Accept receiving unsigned messages
- :white_check_mark: Accept receiving signed messages
- :white_check_mark: Accept receiving encrypted messages
- :x: Messages sent will be unsigned and not encrypted
- :white_check_mark: Messages sent will be signed but not encrypted
- :x: Messages sent will be signed and encrypted

##### encrypt
- :x: Accept receiving unsigned messages
- :x: Accept receiving signed messages
- :white_check_mark: Accept receiving encrypted messages
- :x: Messages sent will be unsigned and not encrypted
- :x: Messages sent will be signed but not encrypted
- :white_check_mark: Messages sent will be signed and encrypted


#### Errors
Errors are returned as an instance of `UdpResponderError`.

| Code               | Direction | Description                                                                    |
---------------------|-----------|--------------------------------------------------------------------------------|
| COMMAND_EMPTY      | Outgoing  | You must specify a command when sending a message                              |
| INVALID_SIGNATURE  | Incoming  | Message received but had invalid signature.                                    |
| INVALID_ENCRYPTION | Incoming  | Message received but could not be encrypted probably due to an invalid secret. |
| EXPIRED            | Incoming  | Message received but expired ? milliseconds ago.                               |
| INVALID_DATA_TYPE  | Incoming  | Message received with invalid ? content and could not be parsed.               |
| UNKNOWN_DATA_TYPE  | Either    | Message received but the data type of ? is unimplemented.                      |

#### UdpResponder::open()
Start listening for messages on the network

#### UdpResponder::close()
Stop listening for messages on the network

#### UdpResponder::broadcast(cmd:string, data:any)
Broadcast a message on the network. You must specify a command but data is optional.

## Example
```javascript
const UdpResponder = require('ec-udp-responder')

const udpResponder = new UdpResponder({
  secret: 'abcdefg'
})

udpResponder.on('opened', async function () {
  udpResponder.broadcast('EXAMPLE-HELLO-COMMAND', {
    name: 'Joe Bloggs',
    hobbies: ['running', 'cycling', 'singing']
  })
})

udpResponder.on('message', async function (msg, sender) {
  if (msg.command === 'EXAMPLE-HELLO-COMMAND') {
    udpResponder.broadcast('EXAMPLE-WELCOME-COMMAND', `A warm welcome to ${msg.name}`)
  }
})

udpResponder.open()

// You can stop broadcasting by calling destroy
// udpResponder.close()
```
