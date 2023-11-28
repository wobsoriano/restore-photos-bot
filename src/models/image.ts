import Replicate from 'replicate';

const replicate = new Replicate({
	auth: process.env.REPLICATE_API_TOKEN,
});

export async function deoldifyImage(imageUrl: string): Promise<string> {
	return await runReplicateModel(
		'arielreplicate/deoldify_image:0da600fab0c45a66211339f1c16b71345d22f26ef5fea3dca1bb90bb5711e950',
		{
			input_image: imageUrl,
			model_name: 'Artistic',
		},
	);
}

export async function faceRestoration(imageUrl: string): Promise<string> {
	return await runReplicateModel(
		'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
		{
			img: imageUrl,
			scale: 2,
			version: 'v1.4',
		},
	);
}

export async function deblur(imageUrl: string): Promise<string> {
	return await runReplicateModel(
		'megvii-research/nafnet:018241a6c880319404eaa2714b764313e27e11f950a7ff0a7b5b37b27b74dcf7',
		{
			image: imageUrl,
			task_type: 'Image Debluring (REDS)',
		},
	);
}

async function runReplicateModel(
	model: `${string}/${string}:${string}`,
	input: Record<string, string | number>,
): Promise<string> {
	const output = await replicate.run(model, {
		input,
	});

	return output as unknown as string;
}
