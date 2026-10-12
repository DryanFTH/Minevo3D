import { useRef, useState } from 'react';

import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';
import { cn } from '../lib/cn';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, {
    animation: 'run',
    cape: true,
    resetOnCapeChange: false,
    capePhysics: { stiffness: 50, damping: 5 },
});

const capeInput = document.querySelector('#cape');
capeInput?.addEventListener('change', event => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;
    viewer.setCape(input.files[0]);
});

viewer.dispose();`;

const reactCode = `import { useState } from 'react';
import { ReactMinevo3D } from 'minevo3d/react';

export function CapePropExample() {
    const [file, setFile] = useState<File | null>(null);
    const [showCape, setShowCape] = useState(true);
    const [resetAnimation, setResetAnimation] = useState(false);

    return (
        <>
            <input
                type='file'
                accept='image/png'
                onChange={event => setFile(event.target.files?.[0] ?? null)}
            />
            <label>
                <input
                    type='checkbox'
                    checked={showCape}
                    onChange={event => setShowCape(event.target.checked)}
                />
                Show cape
            </label>
            <label>
                <input
                    type='checkbox'
                    checked={resetAnimation}
                    onChange={event => setResetAnimation(event.target.checked)}
                />
                Reset the animation when the cape changes
            </label>
            <div className='h-115 w-90'>
                <ReactMinevo3D
                    animation='run'
                    cape={showCape ? (file ?? true) : null}
                    resetOnCapeChange={resetAnimation}
                    capePhysics={{ stiffness: 50, damping: 5 }}
                />
            </div>
        </>
    );
}`;

export function CapeProp() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [showCape, setShowCape] = useState(true);
    const [resetAnimation, setResetAnimation] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const selectCape = (selectedFile: File | undefined) => {
        if (!selectedFile) return;

        if (selectedFile.type !== 'image/png') {
            setError('Unsupported file type. Please choose a PNG image.');
            return;
        }

        setFile(selectedFile);
        setError(null);
    };

    const clearCape = () => {
        setFile(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <ExampleTemplate
            number={19}
            category='Skins & capes'
            title='Set cape with props'
            description='Use the default cape or upload a PNG. Adjust its visibility and physics, and choose whether changing the cape resets the animation.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-115 w-90'>
                    <ReactMinevo3D
                        animation='run'
                        cape={showCape ? (file ?? true) : null}
                        resetOnCapeChange={resetAnimation}
                        capePhysics={{ stiffness: 50, damping: 5 }}
                        onCapeError={capeError => setError(capeError.message)}
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
                        onChange={event => selectCape(event.target.files?.[0])}
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
                            selectCape(event.dataTransfer.files[0]);
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
                            {isDragging ? 'Drop the file here' : 'Upload a PNG cape'}
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
                    {file && !error && (
                        <div className='flex min-w-0 items-center gap-2.25 rounded-lg border border-[#2a2e3a] bg-[#20232c] p-2.25'>
                            <span className='shrink-0 rounded-sm bg-[#1f3b2a] px-1.25 py-1 text-[9px] font-extrabold text-[#5ad17a]'>
                                PNG
                            </span>
                            <span
                                className='min-w-0 flex-1 overflow-hidden text-xs text-[#e6e8ee] text-ellipsis whitespace-nowrap'
                                title={file.name}
                            >
                                {file.name}
                            </span>
                            <button
                                type='button'
                                aria-label='Remove selected cape'
                                onClick={clearCape}
                            >
                                Remove
                            </button>
                        </div>
                    )}
                    <label className='flex items-center gap-2'>
                        <input
                            className='m-0 flex-none'
                            type='checkbox'
                            checked={showCape}
                            onChange={event => setShowCape(event.target.checked)}
                        />
                        Show cape
                    </label>
                    <label className='flex items-center gap-2'>
                        <input
                            className='m-0 flex-none'
                            type='checkbox'
                            checked={resetAnimation}
                            onChange={event => setResetAnimation(event.target.checked)}
                        />
                        Reset the animation when the cape changes
                    </label>
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
