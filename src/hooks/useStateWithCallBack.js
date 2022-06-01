import {useCallback, useEffect, useRef, useState} from "react";

const useStateWithCallBack = (initState)=>{
    const [state, setState] = useState(initState)
    const callbackRef = useRef()

    const updateState = useCallback((newState, cb)=>{
        callbackRef.current = cb

        setState((prevState)=>{
           return typeof newState === 'function'
               ? newState(prevState)
               : newState
        })
    },[])
    useEffect(()=>{
        if(callbackRef.current){
            callbackRef.current(state)
            callbackRef.current(null)
        }
    },[state])

    return [state, updateState]
}

export default useStateWithCallBack