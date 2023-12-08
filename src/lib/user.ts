import { supabase } from './supabase';

interface User {
	id: number;
	telegram_id: number;
	credits: number;
	created_at: string;
}

export const DEFAULT_CREDITS = 5;

export async function getUser(telegramId: number): Promise<User | null> {
	const { data: record } = await supabase
		.from('users')
		.select('*')
		.eq('telegram_id', telegramId)
		.limit(1);
	return record?.length ? record[0] : null;
}

export async function addUser(telegramId: number): Promise<User> {
	await supabase.from('users').insert({
		telegram_id: telegramId,
		credits: DEFAULT_CREDITS,
	});

	return {
		telegram_id: telegramId,
		credits: 5,
	} as unknown as User;
}

export async function addCredits(telegramId: number, count: number) {
	const user = await getUser(telegramId);
	const currentCredits = user?.credits ?? DEFAULT_CREDITS;

	await supabase
		.from('users')
		.update({
			credits: currentCredits + count,
		})
		.eq('telegram_id', telegramId);
}

export async function deductCredits(telegramId: number, count: number) {
	const user = await getUser(telegramId);
	const currentCredits = user?.credits ?? DEFAULT_CREDITS;

	await supabase
		.from('users')
		.update({
			credits: currentCredits - count,
		})
		.eq('telegram_id', telegramId);
}
