import math,wave,array,random
from pathlib import Path
sr=44100;duration=42;out=array.array('f',[0])*(sr*duration);rng=random.Random(14)
chords=[(48,55,59,64),(45,52,55,60),(41,48,52,57),(43,50,53,59)]
def note(start,dur,midi,amp=.06):
 freq=440*2**((midi-69)/12);begin=int(start*sr);n=int(dur*sr)
 for j in range(min(n,len(out)-begin)):
  t=j/sr;env=(1-math.exp(-t*60))*math.exp(-t*2.5)*min(1,(dur-t)*6)
  out[begin+j]+=amp*env*(math.sin(2*math.pi*freq*t)+.22*math.sin(4*math.pi*freq*t))
beat=60/102
for b in range(int(duration/beat)):
 start=b*beat;ch=chords[(b//8)%4];note(start,1.4,ch[b%4]+12,.055)
 if b%2==0:note(start,1.6,ch[0]-12,.09)
 if b%4==0:
  for m in ch:note(start,2.8,m,.018)
for start in [4,10,15,21,25,31,36]:
 begin=int(start*sr)
 for j in range(int(.12*sr)):
  t=j/sr;out[begin+j]+=.023*rng.uniform(-1,1)*math.exp(-t*45)
samples=array.array('h',(int(max(-.9,min(.9,v))*32767*min(1,i/sr,(len(out)-i)/sr/1.8)) for i,v in enumerate(out)))
with wave.open(str(Path(__file__).parent/'public/score.wav'),'w') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(samples.tobytes())
