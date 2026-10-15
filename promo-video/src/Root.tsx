import { Composition } from 'remotion'
import { Main, TOTAL } from './aifl/Main'

export const Root: React.FC = () => {
  return (
    <Composition
      id="QingYingPromo"
      component={Main}
      durationInFrames={TOTAL}
      fps={30}
      width={1920}
      height={1080}
    />
  )
}
