/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License") you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

function App (baseUrl = 'https://app.gabbi.ai') {
  this.state = {}
  this.baseUrl = baseUrl
  this.frameEl = this.createFrame()
}

App.prototype = {
  initialize () {
    window.addEventListener('message', this.receiveMessage.bind(this), false)
    document.addEventListener('deviceready', this.deviceReady.bind(this), false)
  },

  deviceReady (data) {
    const push = PushNotification.init({
      ios: {
        alert: 'true',
        badge: 'true',
        sound: 'true'
      },
      android: {
        icon: 'notification_ic',
        vibrate: true,
        senderID: 1004304006659,
        iconColor: '#E05EAA',
        forceShow: true
      },
      browser: {
        pushServiceURL: 'http://push.api.phonegap.com/v1/push'
      },
      windows: {}
    })

    const state = this.state
    state.model = device.model
    state.platform = device.platform.toLowerCase()
    state.platformVersion = device.version

    const baseUrl = this.baseUrl

    if (state.platform === 'ios' || state.platform === 'android') {
      push.on('registration', (data) => {
        console.log('Device token -', data.registrationId)
        state.deviceToken = data.registrationId

        cordova.getAppVersion.getVersionNumber().then((version) => {
          console.log('App version -', version)
          state.version = version

          this.sendMessage('updateState', this.state)
        })

        this.attachFrame(baseUrl, () => {
          this.sendMessage('deviceReady', this.state)
        })
      })
    } else {
      this.attachFrame(baseUrl)
    }

    push.on('notification', (data) => {
      console.log('Notification -')
      console.dir(data)

      if (data.additionalData.foreground) {
        cordova.plugins.notification.local.schedule({
          title: data.title,
          text: data.message,
          foreground: true,
          additionalData: data.additionalData
        })

        cordova.plugins.notification.local.on('click', (evt) => {
          console.log('Tapped -')
          console.dir(evt)

          if(data.additionalData) {
            this.navigateFrame(baseUrl + '/' + data.additionalData.routeId + '/' + data.additionalData.conversationId)
          }
        }, data)

        return
      }

      if (data.additionalData) {
        this.navigateFrame(baseUrl + '/' + data.additionalData.routeId + '/' + data.additionalData.conversationId)
      }
    })

    push.on('error', (err) => {
      console.log('Error -')
      console.dir(err)

      this.navigateFrame(baseUrl)
    })
  },

  createFrame () {
    const frame = document.createElement('iframe')

    frame.id = 'mainFrame'

    frame.style.width = '100%'
    frame.style.height = '100%'
    frame.style.border = 0

    return frame
  },

  attachFrame (src, onload) {
    if (onload) this.frameEl.onload = onload

    this.navigateFrame(src)
    document.body.appendChild(this.frameEl)
  },

  navigateFrame (src, onload) {
    this.frameEl.src = src
  },

  sendMessage (name, data) {
    this.frameEl.contentWindow.postMessage({ name, data }, '*')
  },

  receiveMessage (evt) {
    const { name, data } = evt.data

    if (name === 'exec') {
      this.exec(data)
    }
  },

  exec (fn) {
    'use strict'
    eval.call({}, `(function () { ${fn} })`).apply(this)
  }
}

// const app = new App('http://localhost:8080')
// const app = new App('http://10.0.2.2:8080')
// const app = new App('http://dev.gabbi.ai')
const app = new App()

app.initialize()
