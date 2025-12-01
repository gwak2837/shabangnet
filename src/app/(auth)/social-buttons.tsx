import { Button } from '@/components/ui/button'

import { signInWithProvider } from './actions'

export function SocialButtons() {
  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      <form action={signInWithProvider.bind(null, 'google')}>
        <Button className="w-full" type="submit" variant="outline">
          구글
        </Button>
      </form>
      <form action={signInWithProvider.bind(null, 'kakao')}>
        <Button className="w-full" type="submit" variant="outline">
          카카오
        </Button>
      </form>
      <form action={signInWithProvider.bind(null, 'naver')}>
        <Button className="w-full" type="submit" variant="outline">
          네이버
        </Button>
      </form>
    </div>
  )
}
