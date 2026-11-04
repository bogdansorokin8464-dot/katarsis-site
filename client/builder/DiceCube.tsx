import {forwardRef,useImperativeHandle,useRef} from 'react';
import {format} from './stats';
const SIDES = ['front','back','right','left','top','bottom'] as const;
const DOTS: Record<number,[number,number][]> = {
 1:[[50,50]],2:[[24,24],[76,76]],3:[[24,24],[50,50],[76,76]],
 4:[[24,24],[76,24],[24,76],[76,76]],5:[[24,24],[76,24],[50,50],[24,76],[76,76]],
 6:[[24,24],[76,24],[24,50],[76,50],[24,76],[76,76]],
};
const pips = (value:number) => (
 <svg viewBox="0 0 100 100" aria-hidden="true">{DOTS[value].map(([x,y])=><circle key={`${x}:${y}`} cx={x} cy={y} r={9}/>)}</svg>
);
const modifier = (value:number|null) => <span className="dice-modifier">{value===null?'✦':format(value)}</span>;
export interface CubeHandle { spin: () => Promise<void> }
/* Same six-face cube as before: pip faces for a k6 result, one modifier on
   every face otherwise. React owns the faces, the animation stays cosmetic. */
export const DiceCube = forwardRef<CubeHandle,{die:number|null;value:number|null}>(function DiceCube({die,value},ref){
 const cube=useRef<HTMLSpanElement>(null);
 useImperativeHandle(ref,()=>({
  spin(){
   const node=cube.current;
   if(!node)return Promise.resolve();
   const animation=node.animate([
    {transform:'translate3d(-180px,-100px,0) rotateX(530deg) rotateY(-580deg) rotateZ(-60deg)',opacity:0,offset:0},
    {transform:'translate3d(-30px,-70px,50px) rotateX(300deg) rotateY(-180deg) rotateZ(18deg)',opacity:1,offset:.43},
    {transform:'translate3d(10px,12px,0) rotateX(-20deg) rotateY(35deg) rotateZ(-8deg)',offset:.74},
    {transform:'translate3d(0,-12px,0) rotateX(-8deg) rotateY(12deg) rotateZ(4deg)',offset:.86},
    {transform:'translate3d(0,0,0) rotateX(-14deg) rotateY(20deg) rotateZ(0deg)',offset:1},
   ],{duration:1100,easing:'cubic-bezier(.25,.65,.35,1)'});
   return animation.finished.then(()=>undefined,()=>undefined);
  },
 }),[]);
 const sides=die?[1,2,3,4,5,6].filter(n=>n!==die&&n!==7-die):[];
 const values=die?[die,7-die,sides[0],7-sides[0],sides[1],7-sides[1]]:[];
 return <span className="dice-cube" ref={cube} aria-hidden="true">{SIDES.map((side,i)=><span key={side} className={'dice-face dice-face-'+side}>{die?pips(values[i]):modifier(value)}</span>)}</span>;
});
