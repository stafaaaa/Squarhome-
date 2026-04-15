import { Cloud, CloudRain, Sun, Wind } from "lucide-react";

export function WeatherWidget() {
  return (
    <div className="flex flex-col h-full w-full justify-between p-2">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-3xl font-bold">24°</div>
          <div className="text-[10px] uppercase opacity-60 font-medium">Sunny</div>
        </div>
        <Sun className="w-8 h-8 text-yellow-400 animate-spin-slow" />
      </div>
      
      <div className="flex justify-between items-end mt-4">
        <div className="flex flex-col items-center">
          <Cloud className="w-4 h-4 opacity-40" />
          <span className="text-[8px] mt-1">MON</span>
        </div>
        <div className="flex flex-col items-center">
          <CloudRain className="w-4 h-4 text-blue-400" />
          <span className="text-[8px] mt-1">TUE</span>
        </div>
        <div className="flex flex-col items-center">
          <Sun className="w-4 h-4 text-yellow-400" />
          <span className="text-[8px] mt-1">WED</span>
        </div>
        <div className="flex flex-col items-center">
          <Wind className="w-4 h-4 opacity-40" />
          <span className="text-[8px] mt-1">THU</span>
        </div>
      </div>
      
      <div className="text-[10px] opacity-40 mt-2">London, UK</div>
    </div>
  );
}
