import React, {useEffect, useState} from 'react';
import socket from "../../socket";
import ACTIONS from '../../socket/actions'
import {useNavigate} from "react-router-dom";
import {v4} from 'uuid'

const Main = ()=> {
    const [rooms, updateRooms] = useState([])

    const navigate = useNavigate()

    useEffect(()=>{
        socket.on(ACTIONS.SHARE_ROOMS, ({rooms=[]}={}) =>{
            console.log("ROOMS", rooms)
            updateRooms(rooms)
        })
    },[])

    return(
        <div>
            <h1>Available Rooms</h1>

            <ul>
                {rooms.map(roomID => (
                    <li key={roomID}>
                        {roomID}
                        <button
                            onClick={() => navigate(`/room/${roomID}`)}
                        >
                            JOIN ROOM
                        </button>
                    </li>
                ))}
            </ul>

            <button
                onClick={() => navigate(`/room/${v4()}`)}
            >
                Create New Room
            </button>
        </div>
    )
}

export default Main;