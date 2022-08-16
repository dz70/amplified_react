import React, { useState, useEffect } from 'react'
import { Amplify, API, graphqlOperation } from 'aws-amplify'
import { createTodo, updateTodo } from './graphql/mutations'
import { listTodos } from './graphql/queries'
import { newOnUpdateTodo } from './graphql/subscriptions'
import awsExports from './aws-exports'
Amplify.configure( awsExports )

const initialState = { name: '', description: '', isDone: false }
function App() {
  const [ formState, setFormState ] = useState( initialState )
  const [ todos, setTodos ] = useState([])
  const [ updatedTodo, setUpdatedTodo ] = useState([])
  let subOnUpdate
  // useEffect for fetching ToDo's from Dynamo
  useEffect(() => {
    fetchTodos()
  }, [ todos ])
  // useEffect for subscription
  useEffect(() => {
    setUpSubscription()
    return () => {
      subOnUpdate.unsubscribe()
    }
  }, [])
  // Function that inits subscription listeners
  function setUpSubscription() {
    subOnUpdate = API.graphql(
      graphqlOperation( newOnUpdateTodo ))
        .subscribe({
          next: ( data ) => {
            console.log({ data })
            setUpdatedTodo( data )
          }
        })
  }
  function setInput( key, value ) {
    setFormState({ ...formState, [ key ]: value })
  }
  async function fetchTodos() {
    try{
      const todoData = await API.graphql( graphqlOperation( listTodos ) )
      const todos = todoData.data.listTodos.items
      setTodos( todos )
    } catch( error ) {
      console.log( 'Error fetching ToDo\'s! ::::: ', error )
    }
  }
  async function addTodo() {
    try{
      if( !formState.name || !formState.description ) return 
      const todo = { ...formState }
      setTodos([ ...todos, todo ])
      setFormState( initialState )
      await API.graphql( graphqlOperation( createTodo, { input: todo } ) )
    } catch( error ) {
      console.log( 'Error creating ToDo! ::::: ', error )
    }
  }
  async function reconditionTodo({ id, name, description, isDone }) {
    if( !name || !description ) return
    const updatedPost = { id, name, description, isDone: !isDone }
    try{
      await API.graphql({
        query: updateTodo,
        variables: { input: updatedPost },
      })
    } catch( error ) {
      console.log( 'Error updating ToDo! ::::: ', error );
    }
  }
  return (
    <div style={ styles.container} >
      <h2>Demo with an Amplify Backend</h2>
      <input 
        name= 'name'
        onChange={ event => setInput( event.target.name, event.target.value ) }
        style={ styles.input }
        value={ formState.name }
        placeholder='Name'
      />
      <input 
        name= 'description'
        onChange={ event => setInput( event.target.name, event.target.value ) }
        style={ styles.input }
        value={ formState.description }
        placeholder='Description'
      />
      <button 
        style={ styles.button }
        onClick={ addTodo }
      >
        Create Todo
      </button>
      {
        todos.map(( todo, index ) => (
          <div 
            onClick={ () => reconditionTodo( todo ) }
            key={ index }
            style={ styles.todo }
          >
            <p style={{ ...styles.todoName, textDecoration: todo.isDone ? 'line-through' : undefined }}>{ todo.name }</p>
            <p style={ styles.todoDescription }>{ todo.description }</p>
          </div>
        ))
      }
    </div>
  );
}

const styles = {
  container: { width: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 },
  todo: {  marginBottom: 15 },
  input: { border: 'none', backgroundColor: '#ddd', marginBottom: 10, padding: 8, fontSize: 18 },
  todoName: { fontSize: 20, fontWeight: 'bold' },
  todoDescription: { marginBottom: 0 },
  button: { backgroundColor: 'black', color: 'white', outline: 'none', fontSize: 18, padding: '12px 0px' }
}

export default App;
