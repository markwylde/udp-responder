const UdpResponder = require('../index')

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
