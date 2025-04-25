import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Routes, Route } from 'react-router-dom';  

// import Chat from './components/Chat'; 
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Register from './components/Register';

function App() {
  const token = localStorage.getItem('token');
  return (
    <>  
      {token ? (
        <>
          <Sidebar />
        </>
      )  
        : null}
      <Routes>
        {token ? (
          <>
            {/* <Route path="/chat/:userId" element={<Chat />} /> */}
          </>
        ) : (
          <>
          <Route path="/" element={<Login />} /> 
          <Route path="/signup" element={<Register />} />
          </>
        )}
      </Routes> 
    </>

     
  );
}     

export default App;
