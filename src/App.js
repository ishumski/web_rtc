import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Main from "./pages/Main/Main";
import Room from "./pages/Room/Room";
import NotFound from "./pages/NotFound/NotFound";

function App() {

  return (
      <BrowserRouter>
        <Routes>
            <Route path='/room/:id' element={<Room/> } />
            <Route path='/' element={<Main/>} />
            <Route element={<NotFound/>} />
        </Routes>
      </BrowserRouter>
  );
}

export default App;
