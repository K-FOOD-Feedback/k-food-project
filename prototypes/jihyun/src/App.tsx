import { Navigate, Route, Routes } from 'react-router-dom'
import Splash from './pages/Splash'
import Main from './pages/Main'
import Detail from './pages/Detail'
import Comments from './pages/Comments'
import Write from './pages/Write'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/kr" element={<Main lang="kr" />} />
      <Route path="/kr/posts/:id" element={<Detail lang="kr" />} />
      <Route path="/kr/posts/:id/comments" element={<Comments />} />
      <Route path="/en" element={<Main lang="en" />} />
      <Route path="/en/write" element={<Write />} />
      <Route path="/en/posts/:id" element={<Detail lang="en" />} />
      <Route path="/en/posts/:id/comments" element={<Comments />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
