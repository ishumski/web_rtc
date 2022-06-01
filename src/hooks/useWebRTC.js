import {useCallback, useEffect, useRef} from "react";
import freeice from 'freeice'
import useStateWithCallBack from "./useStateWithCallBack";
import socket from "../socket";
const ACTIONS = require('../socket/actions')

export const LOCAL_VIDEO = 'LOCAL_VIDEO'

export default function useWebRTC(roomId){
    const [clients, updateClients] = useStateWithCallBack([]);

    const addNewClient = useCallback((newClient, cb)=>{
        if(!clients.includes(newClient)){
            updateClients(list => [...list, newClient], cb)
        }
    }, [clients ,updateClients])

    const peerConnections = useRef({});
    const localMediaStream = useRef(null);
    const peerMediaElements = useRef ({
        [LOCAL_VIDEO]: null
    });

    useEffect(()=>{
        async function handleNewPeer({peerId, createOffer}){
            if(peerId in peerConnections.current){
                return console.log(`Already connected to ${peerId}`)
            }

            peerConnections.current[peerId] = new RTCPeerConnection({
                iceServers: freeice()
            })

            peerConnections.current[peerId].onicecandidate = (event)=>{
                if(event.candidate){
                    socket.emit(ACTIONS.RELAY_ICE,{
                        peerId,
                        iceCandidate: event.candidate
                    })
                }
            }

            let tracksNumber = 0

            peerConnections.current[peerId].ontrack = ({streams: [remoteStream]})=>{
                tracksNumber++
                if(tracksNumber ===2){//video & audio tracks received
                    addNewClient(peerId, ()=>{
                    peerMediaElements.current[peerId].srcObject=remoteStream
                })
                }
            }
            localMediaStream.current.getTracks().forEach(track=>{
                peerConnections.current[peerId].addTrack(track, localMediaStream.current)
            })
            if(createOffer){
                const offer = await peerConnections.current[peerId].createOffer()
                await peerConnections.current[peerId].setLocalDescription(offer)

                socket.emit(ACTIONS.RELAY_SDP, {
                    peerId,
                    sessionDescription: offer
                })
            }
        }
        socket.on(ACTIONS.ADD_PEER, handleNewPeer)
    }, [])


    useEffect(()=>{
        async function setRemoteVideo({peerId, sessionDescription:remoteDescription}){
            await  peerConnections.current[peerId].setRemoteDescription(
                new RTCSessionDescription(remoteDescription)
            )

            if(remoteDescription.type === 'offer'){
                const answer = await peerConnections.current[peerId].createAnswer()
                await peerConnections.current[peerId].setLocalDescription(answer)

                socket.emit(ACTIONS.RELAY_SDP, {
                    peerId,
                    sessionDescription: answer
                })
            }

        }
        socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteVideo)
    },[])

    useEffect(()=>{
        socket.on(ACTIONS.ICE_CANDIDATE,({peerId, iceCandidate})=>{
            peerConnections.current[peerId].addIceCandidate(
            new RTCIceCandidate(iceCandidate))
        })
    },[])

    useEffect(() => {
        const handleRemovePeer = ({peerID}) => {
            if (peerConnections.current[peerID]) {
                peerConnections.current[peerID].close();
            }

            delete peerConnections.current[peerID];
            delete peerMediaElements.current[peerID];

            updateClients(list => list.filter(client => client !== peerID));
        };

        socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);

        return () => {
            socket.off(ACTIONS.REMOVE_PEER);
        }
    }, []);

    useEffect(()=>{
        async function startCapture(){
            localMediaStream.current = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 1200,
                    height: 500
                },
                audio: true
            })
            addNewClient(LOCAL_VIDEO, ()=>{
                const localVideoElement = peerMediaElements.current[LOCAL_VIDEO]

                if(localVideoElement){
                    localVideoElement.volume = 0
                    localVideoElement.srcObject = localMediaStream.current
                }
            })
        }

        startCapture()
            .then(()=> {socket.emit(ACTIONS.JOIN, {room:roomId} )})
            .catch((e)=> console.log("ERROR", e))

        return ()=>{
            localMediaStream.current.getTracks().forEach(track=> track.stop())
            socket.emit(ACTIONS.LEAVE)
        }

    }, [roomId])

    const provideMediaRef = useCallback((id, node)=>{
        peerMediaElements.current[id] = node
    })

    return {
        clients,
        provideMediaRef
    }

}