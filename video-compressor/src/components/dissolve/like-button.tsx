'use client';
/**
 * LikeButton for React on the web, from dissolve (dissolve-ui). This file is yours. Same props as
 * the React Native version; the button itself lives in like-button.core.ts.
 *
 * Like: the heart pops and sparks burst around it. Unlike: the filled heart snaps away into
 * grains and the outline is back.
 *
 * <LikeButton liked={liked} onChange={setLiked} count={likes} />
 *
 * <LikeButton liked={liked} onChange={setLiked} size={32} color="#FF9F0A" className="gap-2" />
 */
import type { CSSProperties } from 'react';
import { createLikeButton, type LikeButtonProps as CoreProps } from './like-button.core';
import { useDissolveCore } from './react';

export type LikeButtonProps = CoreProps & {
  liked: boolean;
  onChange: (liked: boolean) => void;
  /** Row classes (gap, padding, margins...). */
  className?: string;
  style?: CSSProperties;
};

export function LikeButton({ className, style, ...props }: LikeButtonProps) {
  const { host } = useDissolveCore(createLikeButton, props);
  return <button ref={host} className={className} style={style} />;
}
