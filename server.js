const path = require('path')

const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app)
const {Server} = require('socket.io')
const io = new Server(server)
const {version, validate} = require('uuid')

const ACTIONS = require('./src/socket/actions')

require('dotenv').config()

const PORT = 3005

function getAllRooms(){
    const {rooms} = io.sockets.adapter
    return Array.from(rooms.keys()).filter(roomId=> version(roomId) && validate(roomId) === 4)
}

function shareRoomsInfo(){
    io.emit(ACTIONS.SHARE_ROOMS,{
        rooms: getAllRooms()
    })
}

io.on('connection', socket => {
    shareRoomsInfo()

    socket.on(ACTIONS.JOIN, config=>{
        const {room: roomId} = config
        const {rooms: joinedRooms} = socket
        if(Array.from(joinedRooms).includes(roomId)){
            return console.warn(`Already joined to ${roomId}`)
        }

        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        clients.forEach(clientId => {
            io.to(clientId).emit(ACTIONS.ADD_PEER, {
                peerId: socket.id,
                createOffer: false
            })

            socket.emit(ACTIONS.ADD_PEER, {
                peerId: clientId,
                createOffer: true
            })
        })
        socket.join(roomId)
        shareRoomsInfo()
    })

    function leaveRoom(){
        const {rooms} = socket

        Array.from(rooms).forEach(roomId=>{
            const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || [])

            clients.forEach(clientId =>{
                io.to(clientId).emit(ACTIONS.REMOVE_PEER, {
                    peerId: socket.id
                })
                socket.emit(ACTIONS.REMOVE_PEER, {
                    peerId: clientId,
                })
            })
            socket.leave(roomId)
        })
        shareRoomsInfo()
    }
    socket.on(ACTIONS.LEAVE, leaveRoom)
    socket.on('disconnecting', leaveRoom)

    socket.on(ACTIONS.RELAY_SDP, ({peerId, sessioDescription })=>{
        io.to(peerId).emit(ACTIONS.SESSION_DESCRIPTION, {
            peerId: socket.id,
            sessioDescription
        })
    })
    socket.on(ACTIONS.RELAY_ICE,  ({peerId, iceCandidate})=>{
        io.to( peerId ).emit(ACTIONS.RELAY_ICE,{
            peerId: socket.id,
            iceCandidate
        })
    })

})

server.listen(PORT, ()=>console.log(`Server started on PORT: ${PORT}`))

