import LearnTrack from './learn/LearnTrack.jsx'
import { lessons } from './data/lessons.js'

/** Routes: /auth/learn/<lessonId>. One section for now. */
export default function AuthModule({ segments, navigate }) {
  const lessonId = lessons.find((lesson) => lesson.id === segments[1])?.id ?? lessons[0].id
  return (
    <LearnTrack lessonId={lessonId} onLessonChange={(id) => navigate(['learn', id])} />
  )
}
