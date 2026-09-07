import DetectDemo from './DetectDemo.jsx'
import KeysDemo from './KeysDemo.jsx'
import CrackScene from './CrackScene.jsx'
import RoastDemo from './RoastDemo.jsx'
import TgtDemo from './TgtDemo.jsx'
import TicketDemo from './TicketDemo.jsx'
import LessonTrack from '../../../components/lessons/LessonTrack.jsx'
import { lessons } from '../data/lessons.js'

const demos = {
  secrets: KeysDemo,
  tgt: TgtDemo,
  ticket: TicketDemo,
  kerberoast: RoastDemo,
  detect: DetectDemo,
}

export default function LearnTrack({ lessonId, onLessonChange }) {
  return (
    <LessonTrack
      lessons={lessons}
      demos={demos}
      lessonId={lessonId}
      onLessonChange={onLessonChange}
      overview={<CrackScene />}
    />
  )
}
