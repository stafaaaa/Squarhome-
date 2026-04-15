import * as React from "react";
import { motion } from "motion/react";

export function ClockWidget() {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const date = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col items-start justify-center h-full w-full p-6">
      <div className="flex items-baseline gap-1">
        <motion.span 
          key={hours}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-7xl font-extralight tracking-tighter leading-none"
        >
          {hours}
        </motion.span>
        <span className="text-6xl font-thin opacity-30 animate-pulse">:</span>
        <motion.span 
          key={minutes}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-7xl font-extralight tracking-tighter leading-none"
        >
          {minutes}
        </motion.span>
      </div>
      <div className="text-sm uppercase tracking-[0.1em] opacity-60 mt-4 font-normal">
        {date}
      </div>
    </div>
  );
}
