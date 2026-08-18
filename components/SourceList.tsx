'use client';

import React from 'react';
import { Globe } from '@phosphor-icons/react';
import { SourceRef } from '@/lib/types';
import { Card, CardContent } from './ui/card';

/** 展示最近一次联网检索到的参考来源，供用户核对文稿事实。 */
export const SourceList: React.FC<{ sources?: SourceRef[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;
  return (
    <Card className="border-primary/15 bg-primary/[0.03]">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="h-4 w-4 text-indigo-200" weight="bold" aria-hidden="true" />
          参考来源（{sources.length}）
        </div>
        <ul className="mt-3 space-y-1.5">
          {sources.map((source) => (
            <li key={source.url} className="truncate text-xs text-muted-foreground">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground hover:underline"
              >
                {source.title || source.url}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
