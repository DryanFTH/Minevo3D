import { useRef, useState } from 'react';

import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { type SkinInfo, type SkinSource } from '../../../src/minevo3d';
import { ExampleTemplate } from '../ExampleTemplate';
import { cn } from '../lib/cn';

type SkinSourceKind = 'url' | 'file' | 'blob' | 'image' | 'canvas' | 'bitmap';

const sourceLabels: Record<SkinSourceKind, string> = {
    url: 'string (URL)',
    file: 'File',
    blob: 'Blob',
    image: 'HTMLImageElement',
    canvas: 'HTMLCanvasElement',
    bitmap: 'ImageBitmap',
};

const vanillaCode = `import { CharacterViewer, type SkinSource } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, { animation: 'walk' });
const file = await fetch('/skins/steve.png').then(response => response.blob());
const image = new Image();
image.src = URL.createObjectURL(file);
await image.decode();

const canvas = document.createElement('canvas');
canvas.width = image.naturalWidth;
canvas.height = image.naturalHeight;
canvas.getContext('2d')?.drawImage(image, 0, 0);

const sources: SkinSource[] = [
    '/skins/steve.png',
    file,
    new File([file], 'steve.png', { type: 'image/png' }),
    image,
    canvas,
    await createImageBitmap(file),
];

await viewer.setSkin(sources[0]);
viewer.dispose();`;

const reactCode = `import { useState } from 'react';
import { ReactMinevo3D, type SkinSource } from 'minevo3d/react';

export function SkinSourcesExample() {
    const [skin, setSkin] = useState<SkinSource | null>(null);

    return (
        <>
            <input type='url' onChange={event => setSkin(event.target.value || null)} />
            <input type='file' accept='image/png' onChange={event => setSkin(event.target.files?.[0] ?? null)} />
            <input type='file' accept='image/png' onChange={async event => {
                const file = event.target.files?.[0];
                if (file) setSkin(file.slice(0, file.size, file.type));
            }} />
            <input type='file' accept='image/png' onChange={async event => {
                const file = event.target.files?.[0];
                if (!file) return;

                const image = new Image();
                const url = URL.createObjectURL(file);
                image.src = url;
                try {
                    await image.decode();
                } finally {
                    URL.revokeObjectURL(url);
                }
                setSkin(image);
            }} />
            <input type='file' accept='image/png' onChange={async event => {
                const file = event.target.files?.[0];
                if (!file) return;

                const bitmap = await createImageBitmap(file);
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
                bitmap.close();
                setSkin(canvas);
            }} />
            <input type='file' accept='image/png' onChange={async event => {
                const file = event.target.files?.[0];
                if (file) setSkin(await createImageBitmap(file));
            }} />
            <ReactMinevo3D skin={skin} animation='walk' />
        </>
    );
}`;

export function SkinSources() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [kind, setKind] = useState<SkinSourceKind>('file');
    const [url, setUrl] = useState('');
    const [source, setSource] = useState<SkinSource | null>(null);
    const [info, setInfo] = useState<SkinInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const loadToken = useRef(0);

    const clearSource = () => {
        loadToken.current++;
        setFile(null);
        setUrl('');
        setSource(null);
        setInfo(null);
        setError(null);
        setIsDragging(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const selectSource = async (selectedFile: File) => {
        const token = ++loadToken.current;
        setFile(null);
        setSource(null);
        setInfo(null);
        setError(null);

        if (selectedFile.type !== 'image/png') {
            setError('Unsupported file type. Please choose a PNG image.');
            return;
        }

        try {
            let nextSource: SkinSource;

            if (kind === 'blob') {
                nextSource = selectedFile.slice(0, selectedFile.size, selectedFile.type);
            } else if (kind === 'image' || kind === 'canvas') {
                const image = new Image();
                const url = URL.createObjectURL(selectedFile);
                image.src = url;
                try {
                    await image.decode();
                } finally {
                    URL.revokeObjectURL(url);
                }

                if (kind === 'image') {
                    nextSource = image;
                } else {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.naturalWidth;
                    canvas.height = image.naturalHeight;
                    const context = canvas.getContext('2d');
                    if (!context) throw new Error('2D canvas is not available.');
                    context.drawImage(image, 0, 0);
                    nextSource = canvas;
                }
            } else if (kind === 'bitmap') {
                nextSource = await createImageBitmap(selectedFile);
            } else {
                nextSource = selectedFile;
            }

            if (token === loadToken.current) {
                setFile(selectedFile);
                setSource(nextSource);
            }
        } catch (sourceError) {
            if (token === loadToken.current) {
                setError(
                    sourceError instanceof Error
                        ? sourceError.message
                        : 'Could not create the skin source.',
                );
            }
        }
    };

    const applyUrl = () => {
        loadToken.current++;
        const trimmedUrl = url.trim();
        setFile(null);
        setInfo(null);
        setError(null);
        setSource(trimmedUrl || null);
        if (!trimmedUrl) setError('Enter a skin URL first.');
    };

    const changeKind = (nextKind: SkinSourceKind) => {
        setKind(nextKind);
        clearSource();
    };

    return (
        <ExampleTemplate
            number={7}
            category='Skins & capes'
            title='Skin sources'
            description='Use a URL string, File, Blob, HTMLImageElement, HTMLCanvasElement, or ImageBitmap as a skin source. Each SkinSource option uses the same PNG file.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D
                        skin={source}
                        animation='walk'
                        onSkinLoad={loadedInfo => {
                            setInfo(loadedInfo);
                            setError(null);
                        }}
                        onSkinError={skinError => setError(skinError.message)}
                    />
                </div>
            }
            controls={
                <>
                    <label>
                        Source type
                        <select
                            value={kind}
                            onChange={event =>
                                changeKind(event.target.value as SkinSourceKind)
                            }
                        >
                            {Object.entries(sourceLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {kind === 'url' ? (
                        <>
                            <label htmlFor='skin-source-url'>Skin URL</label>
                            <input
                                id='skin-source-url'
                                type='url'
                                placeholder='https://example.com/skin.png'
                                value={url}
                                onChange={event => setUrl(event.target.value)}
                            />
                            <button type='button' onClick={applyUrl}>
                                Apply URL
                            </button>
                            <p>The remote URL must allow cross-origin (CORS) requests.</p>
                        </>
                    ) : (
                        <>
                            <input
                                ref={fileInputRef}
                                className={cn(
                                    'absolute size-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)]',
                                    'focus-visible:[&+div_button]:outline-2',
                                    'focus-visible:[&+div_button]:outline-[#5ad17a]',
                                    'focus-visible:[&+div_button]:outline-offset-3',
                                )}
                                type='file'
                                accept='image/png'
                                onChange={event => {
                                    const selectedFile = event.target.files?.[0];
                                    if (selectedFile) void selectSource(selectedFile);
                                }}
                            />
                            <div
                                className={cn(
                                    'flex min-h-55 flex-col items-center justify-center gap-1.75 rounded-[10px] border border-dashed border-[#454b5c] bg-[linear-gradient(145deg,#20242e,#191c24)] px-4 py-5.5 text-center transition-[border-color,background,transform] duration-150',
                                    isDragging &&
                                        'scale-[1.01] border-[#5ad17a] bg-[#1f3b2a]',
                                    error && 'border-[#e57474]',
                                )}
                                onDragEnter={event => {
                                    event.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragOver={event => event.preventDefault()}
                                onDragLeave={event => {
                                    if (
                                        !event.currentTarget.contains(
                                            event.relatedTarget as Node | null,
                                        )
                                    ) {
                                        setIsDragging(false);
                                    }
                                }}
                                onDrop={event => {
                                    event.preventDefault();
                                    setIsDragging(false);
                                    const droppedFile = event.dataTransfer.files[0];
                                    if (droppedFile) void selectSource(droppedFile);
                                }}
                            >
                                <span
                                    className={cn(
                                        'mb-1 grid size-11.5 place-items-center rounded-[14px]',
                                        'border border-[#343a49] bg-[#272c38] text-[#5ad17a]',
                                    )}
                                    aria-hidden='true'
                                >
                                    <svg
                                        className={cn(
                                            'size-5.5 stroke-[currentColor]',
                                            '[stroke-linecap:round] [stroke-linejoin:round]',
                                            'stroke-[1.7]',
                                        )}
                                        viewBox='0 0 24 24'
                                        fill='none'
                                    >
                                        <path d='M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5' />
                                    </svg>
                                </span>
                                <strong>
                                    {isDragging
                                        ? 'Drop the file here'
                                        : `Choose a PNG as ${sourceLabels[kind]}`}
                                </strong>
                                <span className='text-xs text-[#8b91a3]'>
                                    Drag a file here or
                                </span>
                                <button
                                    type='button'
                                    className={cn(
                                        'my-0.5 border-[#3d7650] bg-[#1f3b2a] px-3.5 py-1.75',
                                        'font-semibold text-[#5ad17a] hover:bg-[#294b35]',
                                        'focus-visible:outline-2 focus-visible:outline-[#5ad17a]',
                                        'focus-visible:outline-offset-3',
                                    )}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Browse files
                                </button>
                                <span className='text-xs text-[#8b91a3]'>Format PNG</span>
                            </div>
                        </>
                    )}

                    {file && (
                        <p className='m-0 rounded-md border border-[#2e4936] bg-[#1c2b21] p-2.5 text-xs text-[#b8d9c0]'>
                            Active source: {sourceLabels[kind]}
                        </p>
                    )}
                    {info && (
                        <p className='m-0 rounded-md border border-[#2e4936] bg-[#1c2b21] p-2.5 text-xs text-[#b8d9c0]'>
                            {info.width} × {info.height} ·{' '}
                            {info.slim ? 'slim' : 'classic'} arms
                        </p>
                    )}
                    {error && (
                        <p
                            className='m-0 rounded-md border border-[#593438] bg-[#321f22] p-2.5 text-xs text-[#ffaaaa]'
                            role='alert'
                        >
                            {error}
                        </p>
                    )}
                </>
            }
        />
    );
}
