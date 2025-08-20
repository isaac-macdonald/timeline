
import HamburgerMenu from '@/app/components/HamburgerMenu';
import ZoomableTimeline from '@/app/components/Timeline';

export default function Home() {
  return (
    <div className="relative">
      <ZoomableTimeline />
      <HamburgerMenu />
    </div>
  );
}
