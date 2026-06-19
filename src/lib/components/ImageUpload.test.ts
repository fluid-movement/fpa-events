import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import ImageUpload from './ImageUpload.svelte';

// --- Global stubs ---

// jsdom doesn't implement URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
	value: vi.fn(() => 'blob:mock-preview-url'),
	writable: true,
	configurable: true
});
Object.defineProperty(URL, 'revokeObjectURL', {
	value: vi.fn(),
	writable: true,
	configurable: true
});

// jsdom's Image never fires onload; replace with a stub that resolves immediately
class MockImage {
	naturalWidth = 1200;
	naturalHeight = 800;
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;

	set src(_: string) {
		setTimeout(() => this.onload?.(), 0);
	}
}

// --- Helpers ---

function makeFile(name = 'photo.jpg', type = 'image/jpeg') {
	return new File(['image data'], name, { type });
}

function selectFile(input: HTMLInputElement, file: File) {
	Object.defineProperty(input, 'files', { value: [file], configurable: true });
	fireEvent.change(input);
}

function mockFetchSuccess(url = 'https://test.r2.dev/events/new.jpg') {
	vi.mocked(fetch).mockResolvedValueOnce(
		new Response(JSON.stringify({ url, key: 'events/new.jpg' }), { status: 200 })
	);
}

function mockFetchError(message = 'File too large') {
	vi.mocked(fetch).mockResolvedValueOnce(
		new Response(JSON.stringify({ error: message }), { status: 400 })
	);
}

// --- Tests ---

beforeEach(() => {
	vi.stubGlobal('fetch', vi.fn());
	vi.stubGlobal('Image', MockImage);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('ImageUpload — initial state', () => {
	it('shows the "no image" placeholder when no currentUrl is given', () => {
		render(ImageUpload);
		expect(screen.getByText('No image selected')).toBeInTheDocument();
	});

	it('shows "Upload image" label when no currentUrl is given', () => {
		render(ImageUpload);
		expect(screen.getByText('Upload image')).toBeInTheDocument();
	});

	it('hidden picture input is empty by default', () => {
		render(ImageUpload);
		const input = document.querySelector('input[name="picture"]') as HTMLInputElement;
		expect(input.value).toBe('');
	});
});

describe('ImageUpload — with existing image (edit mode)', () => {
	it('renders the existing image', () => {
		render(ImageUpload, {
			props: { currentUrl: 'https://example.com/photo.jpg' }
		});
		const img = screen.getByAltText('Event cover preview') as HTMLImageElement;
		expect(img.src).toBe('https://example.com/photo.jpg');
	});

	it('does not show the "no image" placeholder', () => {
		render(ImageUpload, {
			props: { currentUrl: 'https://example.com/photo.jpg' }
		});
		expect(screen.queryByText('No image selected')).not.toBeInTheDocument();
	});

	it('shows "Change image" label', () => {
		render(ImageUpload, {
			props: { currentUrl: 'https://example.com/photo.jpg' }
		});
		expect(screen.getByText('Change image')).toBeInTheDocument();
	});

	it('hidden picture input contains the existing url', () => {
		render(ImageUpload, {
			props: { currentUrl: 'https://example.com/photo.jpg' }
		});
		const input = document.querySelector('input[name="picture"]') as HTMLInputElement;
		expect(input.value).toBe('https://example.com/photo.jpg');
	});
});

describe('ImageUpload — successful upload', () => {
	it('shows a preview immediately after file selection', async () => {
		mockFetchSuccess();
		render(ImageUpload);

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		selectFile(input, makeFile());

		await waitFor(() => {
			const img = screen.getByAltText('Event cover preview') as HTMLImageElement;
			// Shows the blob preview URL before the upload resolves
			expect(img.src).toMatch(/blob:|https:/);
		});
	});

	it('updates hidden inputs with the uploaded url and dimensions after success', async () => {
		mockFetchSuccess('https://test.r2.dev/events/abc.jpg');
		render(ImageUpload);

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		selectFile(input, makeFile());

		await waitFor(() => {
			const pictureInput = document.querySelector('input[name="picture"]') as HTMLInputElement;
			expect(pictureInput.value).toBe('https://test.r2.dev/events/abc.jpg');
		});

		const widthInput = document.querySelector('input[name="pictureWidth"]') as HTMLInputElement;
		const heightInput = document.querySelector('input[name="pictureHeight"]') as HTMLInputElement;
		expect(widthInput.value).toBe('1200');
		expect(heightInput.value).toBe('800');
	});

	it('changes label to "Change image" after a successful upload', async () => {
		mockFetchSuccess();
		render(ImageUpload);

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		selectFile(input, makeFile());

		await waitFor(() => {
			expect(screen.getByText('Change image')).toBeInTheDocument();
		});
	});

	it('calls the upload endpoint with the selected file', async () => {
		mockFetchSuccess();
		render(ImageUpload);

		const file = makeFile('my-photo.jpg', 'image/jpeg');
		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		selectFile(input, file);

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				'/api/events/upload-image',
				expect.objectContaining({ method: 'POST' })
			);
		});
	});
});

describe('ImageUpload — failed upload', () => {
	it('shows an error message returned from the server', async () => {
		mockFetchError('File must be an image');
		render(ImageUpload);

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		selectFile(input, makeFile());

		await waitFor(() => {
			expect(screen.getByText('File must be an image')).toBeInTheDocument();
		});
	});

	it('reverts the preview to the empty state after a failed upload', async () => {
		mockFetchError();
		render(ImageUpload);

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		selectFile(input, makeFile());

		await waitFor(() => {
			expect(screen.getByText('No image selected')).toBeInTheDocument();
		});
	});

	it('does not update hidden picture input on failure', async () => {
		mockFetchError();
		render(ImageUpload);

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		selectFile(input, makeFile());

		await waitFor(() => {
			expect(screen.getByText('No image selected')).toBeInTheDocument();
		});

		const pictureInput = document.querySelector('input[name="picture"]') as HTMLInputElement;
		expect(pictureInput.value).toBe('');
	});
});
