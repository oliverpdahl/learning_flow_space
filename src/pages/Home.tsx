import {
  Box,
  Button,
  ButtonGroup,
  Drawer,
  Chip,
  Divider
} from '@material-ui/core'
import React from 'react'
import CheckCircleIcon from '@material-ui/icons/CheckCircle'
import ErrorIcon from '@material-ui/icons/Error'
import CancelIcon from '@material-ui/icons/Cancel'
import { Link } from 'react-router-dom'
import routes from './routes'
import Alert from '@material-ui/lab/Alert'
import AlertTitle from '@material-ui/lab/AlertTitle'
import Wrapper from '../components/Wrapper'
import AppBar from '../components/AppBar'
import { useForm } from 'react-hook-form'
import firebase from '../firebase'
import { useEffect, useState } from 'react'

const Home = () => {
  const [sessionStart, setSessionStart] = useState(0)
  const [focusLock, setFocusLock] = useState(false)
  const [sessionID, setSessionID] = useState('')
  let stringArray: string[] = []
  const [focusedUsers, setFocusedUsers] = useState(stringArray)
  const [warningUsers, setWarningUsers] = useState(stringArray)
  const [unfocusedUsers, setUnfocusedUsers] = useState(stringArray)
  const [currentTool, setCurrentTool] = useState('typing')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sessionLength, setSessionLength] = useState(0)
  const [sessionStatus, setSessionStatus] = useState('focused')

  const sessionRef = firebase.database().ref('Session')
  const interactRef = firebase.database().ref('Interact')

  const focusThreshold = 5000 * 60
  const warningThreshold = 3000 * 60
  const goalSessionLength = 25000 * 60

  const getSessionLengthNormalized = () => {
    const now = new Date().getTime()
    const currentDuration = now - sessionStart
    var lengthtoget = 100
    if (currentDuration < goalSessionLength) {
      lengthtoget = (currentDuration * 100) / goalSessionLength
    }
    setSessionLength(lengthtoget)
  }

  const updateUser = () => {
    const userID = firebase.auth().currentUser?.uid || ''
    const userName = firebase.auth().currentUser?.displayName || ''
    return { userID: userID, userName: userName }
  }

  const updateSessionStatus = (status: string) => {
    const userInfo = updateUser()
    if (!!sessionID) {
      sessionRef.child(sessionID).update({ status: status, ...userInfo })
    }
  }

  const setSessionToUnfocused = () => {
    if (!!sessionID) {
      sessionRef.child(sessionID).update({ status: 'unfocused' })
    }
  }

  const getSessionStatus = () => {
    sessionRef
      .orderByChild('userID')
      .equalTo(firebase.auth().currentUser?.uid || '')
      .limitToLast(1)
      .on('value', snapshot => {
        const sessions = snapshot.val()
        const ids = []
        for (let id in sessions) {
          ids.push(sessions[id].status)
        }
        setSessionStatus(ids[0])
      })
  }

  const getSessionID = () => {
    sessionRef
      .orderByChild('userID')
      .equalTo(firebase.auth().currentUser?.uid || '')
      .limitToLast(1)
      .on('value', snapshot => {
        const sessions = snapshot.val()
        const ids = []
        for (let id in sessions) {
          ids.push(id)
        }
        setSessionID(ids[0])
      })
  }

  const getUsersStatuses = () => {
    sessionRef.orderByChild('status').on('value', snapshot => {
      const sessions = snapshot.val()
      let focusedUsersCollect: string[] = []
      let warningUserCollect: string[] = []
      let unfocusedUsersCollect: string[] = []
      for (let id in sessions) {
        const status = sessions[id].status
        const username = sessions[id].userName
        if (status === 'focused') {
          focusedUsersCollect.push(username)
        } else if (status === 'warning') {
          warningUserCollect.push(username)
        } else if (status === 'unfocused') {
          unfocusedUsersCollect.push(username)
        }
      }
      setFocusedUsers(focusedUsersCollect)
      setWarningUsers(warningUserCollect)
      setUnfocusedUsers(unfocusedUsersCollect)
    })
  }

  const checkFocus = () => {
    interactRef
      .orderByChild('userID')
      .equalTo(firebase.auth().currentUser?.uid || '')
      .limitToLast(1)
      .on('value', snapshot => {
        const interacts = snapshot.val()
        const lasttwointeracts = []
        for (let id in interacts) {
          lasttwointeracts.push({ id, ...interacts[id] })
        }
        if (!focusLock) {
          if (!!lasttwointeracts[0]) {
            const t1 = lasttwointeracts[0].time
            const now = new Date().getTime()
            const dif = now - t1
            if (dif > focusThreshold) {
              updateSessionStatus('unfocused')
            } else if (dif > warningThreshold) {
              updateSessionStatus('warning')
            } else {
              updateSessionStatus('focused')
            }
          } else {
            updateSessionStatus('focused')
          }
        }
      })
  }

  const handleFocus = () => {
    updateUser()
    checkFocus()
    getSessionStatus()
    getUsersStatuses()
    getSessionLengthNormalized()
  }

  useEffect(() => {
    const timer = setInterval(() => {
      handleFocus()
    }, 5000)
    window.addEventListener('beforeunload', ev => {
      if (!!sessionID) {
        sessionRef.child(sessionID).update({ focused: false })
      }
      updateSessionStatus('closed')
      setFocusLock(true)
    })

    return () => {
      clearInterval(timer)
    }
  })

  const createSession = () => {
    const now = new Date().getTime()
    const session = {
      time: now,
      status: 'focused',
      userID: firebase.auth().currentUser?.uid || '',
      userName: firebase.auth().currentUser?.displayName || ''
    }
    sessionRef.push(session)
    getSessionID()
    return now
  }

  const checkSetSession = () => {
    if (sessionStart === 0) {
      setSessionStart(createSession())
    }
  }

  const createClick = () => {
    const now = new Date().getTime()

    checkSetSession()

    const interact = {
      time: now,
      type: 'click',
      userID: firebase.auth().currentUser?.uid || '',
      userName: firebase.auth().currentUser?.displayName || ''
    }
    interactRef.push(interact)
  }

  const createKeyDown = () => {
    const now = new Date().getTime()

    checkSetSession()

    const interact = {
      time: now,
      type: 'keydown',
      userID: firebase.auth().currentUser?.uid || '',
      userName: firebase.auth().currentUser?.displayName || ''
    }
    interactRef.push(interact)
  }

  const sessionStartAsDate = () => {
    const date = new Date(sessionStart)
    return date.toLocaleString()
  }

  const focusAlert = () => {
    if (sessionStatus === 'unfocused') {
      return (
        <Alert severity='error'>
          <AlertTitle>Unfocused</AlertTitle>
          You might have left the page and have lost your focus — to restart
          your focus <strong>Click Here!</strong>
        </Alert>
      )
    } else if (sessionStatus === 'warning') {
      return (
        <Alert severity='warning'>
          <AlertTitle>Check In</AlertTitle>
          <strong>Click Here </strong> to check in and show that you are still
          on the page — <strong>don't loose your focus!</strong>
        </Alert>
      )
    } else if (sessionStatus === 'focused') {
      return (
        <Alert severity='success'>
          <AlertTitle>Focused</AlertTitle>
          You're doing great —{' '}
          <strong onClick={setDrawerToOpen}>Click Here</strong> to see who else
          is active!
        </Alert>
      )
    } else {
      ;<Alert severity='info'>
        <AlertTitle>No Active Session</AlertTitle>
        No active session
        <strong onClick={setDrawerToOpen}>Click Here</strong> start one.
      </Alert>
    }
  }

  const getFocusedUserMap = () => {
    return (
      <p>
        {focusedUsers.map(username => (
          <Chip
            style={{ margin: '2px', backgroundColor: '#edf7ed' }}
            label={username}
            icon={<CheckCircleIcon style={{ color: '#81c683' }} />}
          />
        ))}
      </p>
    )
  }

  const getLoosingFocusUserMap = () => {
    return (
      <p>
        {warningUsers.map(username => (
          <Chip
            style={{ margin: '2px', backgroundColor: '#fff4e5' }}
            label={username}
            icon={<ErrorIcon style={{ color: '#ffa12e' }} />}
          />
        ))}
      </p>
    )
  }

  const getUnfocusedUserMap = () => {
    return (
      <p>
        {unfocusedUsers.map(username => (
          <Chip
            style={{ margin: '2px', backgroundColor: '#fdecea' }}
            label={username}
            icon={<CancelIcon style={{ color: '#f5655b' }} />}
          />
        ))}
      </p>
    )
  }

  const setToolToTyping = () => {
    setCurrentTool('typing')
  }

  const setToolToSketch = () => {
    setCurrentTool('sketch')
  }

  const embedTool = () => {
    if (currentTool === 'sketch') {
      return (
        <iframe
          id='embeddedTool'
          src='https://sketch.io/sketchpad'
          style={{
            height: '75vh',
            left: '0',
            position: 'relative',
            top: '0',
            width: '100%'
          }}
        />
      )
    } else {
      return (
        <iframe
          id='embeddedTool'
          src='https://www.typing.com/student/lessons'
          style={{
            height: '75vh',
            left: '0',
            position: 'relative',
            top: '0',
            width: '100%'
          }}
        />
      )
    }
  }

  const setDrawerToOpen = () => {
    setDrawerOpen(true)
  }

  const setDrawerToClosed = () => {
    setDrawerOpen(false)
  }

  return (
    <>
      <AppBar
        sessionLength={sessionLength}
        actions={
          <Button
            color='primary'
            size='small'
            component={Link}
            to={routes.signin}
            variant='contained'
          >
            {!!firebase.auth().currentUser ? 'Log Out' : 'Sign In or Sign Up'}
          </Button>
        }
      />
      <React.Fragment key={'right'}>
        <Drawer anchor={'right'} open={drawerOpen} onClose={setDrawerToClosed}>
          <Box m={2} width='20vw'>
            {getFocusedUserMap()}
            {!!warningUsers[0] && !!focusedUsers[0] ? <Divider /> : ''}
            {getLoosingFocusUserMap()}
            {(!!warningUsers[0] || !!focusedUsers[0]) && !!unfocusedUsers[0] ? (
              <Divider />
            ) : (
              ''
            )}
            {getUnfocusedUserMap()}
          </Box>
        </Drawer>
      </React.Fragment>
      <div
        id='wrapperDiv'
        tabIndex={0}
        onClick={createClick}
        onKeyDown={createKeyDown}
        style={{ width: '100%', height: '100%', userSelect: 'none' }}
      >
        <Wrapper>
          {focusAlert()}
          <ButtonGroup
            style={{ width: '100%', marginTop: '10px' }}
            variant='contained'
            size='large'
            color='primary'
          >
            <Button style={{ width: '50%' }} onClick={setToolToTyping}>
              Typing
            </Button>
            <Button style={{ width: '50%' }} onClick={setToolToSketch}>
              Sketchpad
            </Button>
          </ButtonGroup>
          {embedTool()}
        </Wrapper>
      </div>
    </>
  )
}

export default Home
