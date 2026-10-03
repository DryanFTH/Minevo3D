import { type ReactNode, useState } from 'react';

import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.css';

import { cn } from './lib/cn';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);

export type ExampleTemplateProps = {
    number: number;
    category: string;
    title: string;
    description: string;
    preview: ReactNode;
    controls?: ReactNode;
    vanillaCode: string;
    reactCode: string;
};

export function ExampleTemplate({
    number,
    category,
    title,
    description,
    preview,
    controls,
    vanillaCode,
    reactCode,
}: ExampleTemplateProps) {
    const [mode, setMode] = useState<'vanilla' | 'react'>('vanilla');
    const [copied, setCopied] = useState(false);
    const code = mode === 'vanilla' ? vanillaCode : reactCode;
    const highlightedCode = hljs.highlight(code, { language: 'tsx' }).value;

    const copyCode = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <>
            <header className='mx-auto mb-5.5 max-w-212.5'>
                <span className='text-[11px] font-bold tracking-widest text-[#5ad17a] uppercase'>
                    {category} · Example {String(number).padStart(2, '0')}
                </span>
                <h1 className='my-1.75 mb-1.25 text-[clamp(25px,3vw,34px)] leading-[1.2]'>
                    {title}
                </h1>
                <p className='m-0 max-w-[70ch] text-[#8b91a3]'>{description}</p>
            </header>
            <section
                className={cn(
                    'mx-auto grid items-stretch gap-4.5',
                    'max-w-212.5 grid-cols-[minmax(0,1fr)_minmax(220px,280px)]',
                    'max-[760px]:grid-cols-1',
                    controls === undefined && 'max-w-142 grid-cols-1',
                )}
                aria-label={`${title} demo`}
            >
                <div
                    className={cn(
                        'grid min-h-115 place-items-center p-5',
                        'rounded-[10px] border border-[#2a2e3a] bg-[#1b1e26]',
                        'max-[760px]:min-h-105',
                    )}
                >
                    <div
                        className={cn(
                            '[&>div]:overflow-hidden [&>div]:rounded-lg',
                            '[&>div]:bg-[#0f1116]',
                        )}
                    >
                        {preview}
                    </div>
                </div>
                {controls !== undefined && (
                    <aside
                        className={cn(
                            'rounded-[10px] border border-[#2a2e3a] bg-[#1b1e26]',
                            'p-4.5',
                        )}
                    >
                        <h2 className='mt-0 mb-3.5 text-[15px]'>Settings</h2>
                        <div
                            className={cn(
                                'flex flex-col items-stretch gap-2 [&_label]:text-[#8b91a3]',
                                '[&_button]:cursor-pointer [&_button]:rounded-md [&_button]:border',
                                '[&_button]:border-[#2a2e3a] [&_button]:bg-[#242836]',
                                '[&_button]:px-2.5 [&_button]:py-1 [&_button]:text-[#e6e8ee]',
                                '[&_button]:hover:border-[#5ad17a]',
                                '[&_input]:rounded-md [&_input]:border [&_input]:border-[#2a2e3a]',
                                '[&_input]:bg-[#242836] [&_input]:px-2.5 [&_input]:py-1',
                                '[&_input]:text-[#e6e8ee]',
                                '[&_select]:rounded-md [&_select]:border [&_select]:border-[#2a2e3a]',
                                '[&_select]:bg-[#242836] [&_select]:px-2.5 [&_select]:py-1',
                                '[&_select]:text-[#e6e8ee]',
                            )}
                        >
                            {controls}
                        </div>
                    </aside>
                )}
            </section>
            <section
                className={cn(
                    'mx-auto mt-7.5 grid max-w-212.5 items-start gap-6',
                    'grid-cols-[minmax(190px,0.7fr)_minmax(0,1.3fr)]',
                    'max-[760px]:grid-cols-1',
                )}
            >
                <div>
                    <span className='text-[11px] font-bold tracking-widest text-[#5ad17a] uppercase'>
                        Get started
                    </span>
                    <h2 className='my-2 mt-1.5 text-[19px]'>
                        Use Minevo3D in your project
                    </h2>
                    <p className='m-0 text-[#8b91a3]'>
                        Use <code className='text-[#e6e8ee]'>CharacterViewer</code> with
                        Vanilla or <code className='text-[#e6e8ee]'>ReactMinevo3D</code>{' '}
                        with React. Adjust the code below to match this demo.
                    </p>
                </div>
                <div
                    className={cn(
                        'min-w-0 overflow-hidden',
                        'rounded-[10px] border border-[#2a2e3a] bg-[#101218]',
                    )}
                >
                    <div
                        className={cn(
                            'flex items-center justify-between',
                            'border-b border-[#2a2e3a] bg-[#1b1e26]',
                            'px-2.5 py-2',
                        )}
                    >
                        <div
                            className='flex gap-1'
                            role='tablist'
                            aria-label='Integration mode'
                        >
                            <button
                                role='tab'
                                aria-selected={mode === 'vanilla'}
                                className={cn(
                                    'rounded-md border px-2.5 py-1.25',
                                    'text-[#8b91a3]',
                                    mode === 'vanilla'
                                        ? 'border-[#2a2e3a] bg-[#101218] text-[#e6e8ee]'
                                        : 'border-transparent bg-transparent',
                                )}
                                onClick={() => setMode('vanilla')}
                            >
                                Vanilla
                            </button>
                            <button
                                role='tab'
                                aria-selected={mode === 'react'}
                                className={cn(
                                    'rounded-md border px-2.5 py-1.25',
                                    'text-[#8b91a3]',
                                    mode === 'react'
                                        ? 'border-[#2a2e3a] bg-[#101218] text-[#e6e8ee]'
                                        : 'border-transparent bg-transparent',
                                )}
                                onClick={() => setMode('react')}
                            >
                                React
                            </button>
                        </div>
                        <button
                            className='cursor-pointer border-0 bg-transparent px-2.5 py-1.25 text-[#5ad17a]'
                            onClick={copyCode}
                        >
                            {copied ? 'Copied' : 'Copy code'}
                        </button>
                    </div>
                    <pre
                        className={cn(
                            'm-0 overflow-auto p-4',
                            'text-[12px] leading-[1.65] text-[#d5e1d8] tab-4',
                        )}
                    >
                        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
                    </pre>
                </div>
            </section>
        </>
    );
}
