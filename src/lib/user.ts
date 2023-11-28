import { supabase } from './supabase';

interface User {
	id: number;
	telegram_id: number;
	credits: number;
	created_at: string;
}

const DEFAULT_CREDITS = 5;

export async function getUser(telegramId: number): Promise<User | null> {
	const { data: record } = await supabase
		.from('users')
		.select('*')
		.eq('telegram_id', telegramId)
		.limit(1);
	return record?.length ? record[0] : null;
}

export async function addUser(telegramId: number) {
	await supabase.from('users').insert({
		telegram_id: telegramId,
		credits: DEFAULT_CREDITS,
	});
}
