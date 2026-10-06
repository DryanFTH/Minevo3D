import { useRef, useState } from 'react';

import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { type SkinInfo } from '../../../src/minevo3d';
import { ExampleTemplate } from '../ExampleTemplate';
import { cn } from '../lib/cn';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
const input = document.querySelector('#skin-file');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');
if (!(input instanceof HTMLInputElement)) throw new Error('Skin input not found');

const viewer = new CharacterViewer(container, { animation: 'walk' });
let skinUrl;
input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;

    if (skinUrl) URL.revokeObjectURL(skinUrl);
    skinUrl = URL.createObjectURL(file);
    viewer.setSkin(skinUrl);
});

viewer.dispose();`;

const reactCode = `import { useState } from 'react';
import { ReactMinevo3D, type SkinInfo } from 'minevo3d/react';

export function SkinUploaderExample() {
    const [skin, setSkin] = useState<File | null>(null);
    const [info, setInfo] = useState<SkinInfo | null>(null);

    return (
        <>
            <input
                type='file'
                accept='image/png'
                onChange={event => setSkin(event.target.files?.[0] ?? null)}
            />
            {info && <p>{info.width} × {info.height} · {info.slim ? 'slim' : 'classic'}</p>}
            <div className='h-105 w-80'>
                <ReactMinevo3D skin={skin} animation='walk' onSkinLoad={setInfo} />
            </div>
        </>
    );
}`;

export function SkinUploader() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [skin, setSkin] = useState<File | null>(null);
    const [info, setInfo] = useState<SkinInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const selectSkin = (file: File | undefined) => {
        if (!file) return;

        if (file.type !== 'image/png') {
            setError('Unsupported file type. Please choose a PNG image.');
            return;
        }

        setSkin(file);
        setInfo(null);
        setError(null);
    };

    return (
        <ExampleTemplate
            number={6}
            category='Skins & capes'
            title='Upload a skin'
            description='Choose a PNG file to apply a skin to the character. The image size, arm type, and skin format appear after the file loads.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D
                        skin={skin}
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
                    <input
                        ref={inputRef}
                        className={cn(
                            'absolute size-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)]',
                            'focus-visible:[&+div_button]:outline-2',
                            'focus-visible:[&+div_button]:outline-[#5ad17a]',
                            'focus-visible:[&+div_button]:outline-offset-3',
                        )}
                        type='file'
                        accept='image/png'
                        onChange={event => selectSkin(event.target.files?.[0])}
                    />
                    <div
                        className={cn(
                            'flex min-h-55 flex-col items-center justify-center gap-1.75 rounded-[10px] border border-dashed border-[#454b5c] bg-[linear-gradient(145deg,#20242e,#191c24)] px-4 py-5.5 text-center transition-[border-color,background,transform] duration-150',
                            isDragging && 'scale-[1.01] border-[#5ad17a] bg-[#1f3b2a]',
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
                            selectSkin(event.dataTransfer.files[0]);
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
                            {isDragging ? 'Drop the file here' : 'Upload a PNG skin'}
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
                            onClick={() => inputRef.current?.click()}
                        >
                            Browse files
                        </button>
                        <span className='text-xs text-[#8b91a3]'>Format PNG</span>
                    </div>
                    {skin && !error && (
                        <div className='flex min-w-0 items-center gap-2.25 rounded-lg border border-[#2a2e3a] bg-[#20232c] p-2.25'>
                            <span className='shrink-0 rounded-sm bg-[#1f3b2a] px-1.25 py-1 text-[9px] font-extrabold text-[#5ad17a]'>
                                PNG
                            </span>
                            <span
                                className='min-w-0 flex-1 overflow-hidden text-xs text-[#e6e8ee] text-ellipsis whitespace-nowrap'
                                title={skin.name}
                            >
                                {skin.name}
                            </span>
                            <button
                                type='button'
                                aria-label='Remove selected skin'
                                onClick={() => {
                                    setSkin(null);
                                    setInfo(null);
                                    setError(null);
                                    if (inputRef.current) inputRef.current.value = '';
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    )}
                    {info && (
                        <p className='m-0 rounded-md border border-[#2e4936] bg-[#1c2b21] p-2.5 text-xs text-[#b8d9c0]'>
                            {info.width} × {info.height}
                            {info.scale > 1 ? ` (HD ${info.scale}×)` : ''} ·{' '}
                            {info.slim ? 'slim' : 'classic'} arms
                            {info.legacy
                                ? ' · legacy format (before 1.8)'
                                : ' · 1.8+ format'}
                            {info.downscaled ? ' · downscaled (GPU limit exceeded)' : ''}
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
