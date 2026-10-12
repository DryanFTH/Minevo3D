import { useRef, useState } from 'react';

import { ReactMinevo3D, type ReactMinevo3DHandle } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';
import { cn } from '../lib/cn';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, { animation: 'run' });
const skinInput = document.querySelector('#skins');

skinInput?.addEventListener('change', event => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;
    viewer.setSkin(input.files[0], { resetAnimation: false });
});

// Call this when the viewer element is removed.
viewer.dispose();`;

const reactCode = `import { useRef, useState } from 'react';
import { ReactMinevo3D, type ReactMinevo3DHandle } from 'minevo3d/react';

export function SkinSwitcherImperativeExample() {
    const characterRef = useRef<ReactMinevo3DHandle>(null);
    const [skin, setSkin] = useState<File | null>(null);

    return (
        <>
            <input
                type="file"
                accept="image/png"
                onChange={event => setSkin(event.target.files?.[0] ?? null)}
            />
            {skin && (
                <div>
                    {skin.name}
                    <button onClick={() => characterRef.current?.setSkin(skin)}>
                        Change skin (keep animation)
                    </button>
                    <button
                        onClick={() =>
                            characterRef.current?.setSkin(skin, { resetAnimation: true })
                        }
                    >
                        Change skin and reset animation
                    </button>
                </div>
            )}
            <button onClick={() => characterRef.current?.setSkin(null)}>
                Default skin
            </button>
            <div className='h-105 w-80'>
                <ReactMinevo3D ref={characterRef} animation="run" />
            </div>
        </>
    );
}`;

export function SkinSwitcherImperative() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [skin, setSelectedSkin] = useState<File | null>(null);
    const characterRef = useRef<ReactMinevo3DHandle>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const selectSkin = (file: File | undefined) => {
        if (!file) return;

        if (file.type !== 'image/png') {
            setError('Unsupported file type. Please choose a PNG image.');
            return;
        }

        setSelectedSkin(file);
        setError(null);
    };

    const applySkin = (file: File | null, resetAnimation = false) => {
        void characterRef.current
            ?.setSkin(file, { resetAnimation })
            .catch((skinError: Error) => setError(skinError.message));
    };

    return (
        <ExampleTemplate
            number={17}
            category='Skins & capes'
            title='Change skin with the imperative API'
            description='Choose how each skin change works: keep the current animation, restart it, or restore the default skin.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D ref={characterRef} animation='run' />
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
                                    setSelectedSkin(null);
                                    setError(null);
                                    if (inputRef.current) inputRef.current.value = '';
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    )}
                    {skin && !error && (
                        <div>
                            <button onClick={() => applySkin(skin)}>
                                Change skin (keep animation)
                            </button>
                            <button onClick={() => applySkin(skin, true)}>
                                Change skin and reset animation
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            applySkin(null);
                            setSelectedSkin(null);
                            setError(null);
                            if (inputRef.current) inputRef.current.value = '';
                        }}
                    >
                        Default skin
                    </button>
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
