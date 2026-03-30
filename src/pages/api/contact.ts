import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const escapeHtml = (value: string) => {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
};

const json = (body: Record<string, string | boolean>, status = 200) => {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json'
		}
	});
};

export const POST: APIRoute = async ({ request }) => {
	const resendApiKey = import.meta.env.RESEND_API_KEY;
	const toEmail = import.meta.env.CONTACT_TO_EMAIL;
	const fromEmail = import.meta.env.CONTACT_FROM_EMAIL ?? 'onboarding@resend.dev';

	if (!resendApiKey || !toEmail) {
		return json(
			{
				ok: false,
				error: 'Missing email configuration.'
			},
			500
		);
	}

	let body: { name?: string; email?: string; message?: string };

	try {
		body = (await request.json()) as { name?: string; email?: string; message?: string };
	} catch {
		return json(
			{
				ok: false,
				error: 'Invalid request body.'
			},
			400
		);
	}

	const name = body.name?.trim() ?? '';
	const email = body.email?.trim() ?? '';
	const message = body.message?.trim() ?? '';

	if (!name || !email || !message) {
		return json(
			{
				ok: false,
				error: 'Name, email and message are required.'
			},
			400
		);
	}

	if (name.length > 80 || email.length > 120 || message.length > 2000) {
		return json(
			{
				ok: false,
				error: 'One or more fields are too long.'
			},
			400
		);
	}

	const resend = new Resend(resendApiKey);
	const safeName = escapeHtml(name);
	const safeEmail = escapeHtml(email);
	const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

	try {
		await resend.emails.send({
			from: fromEmail,
			to: [toEmail],
			replyTo: email,
			subject: `Portfolio contact from ${name}`,
			text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
			html: `<p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p>${safeMessage}</p>`
		});

		return json({ ok: true });
	} catch {
		return json(
			{
				ok: false,
				error: 'Email service is currently unavailable.'
			},
			500
		);
	}
};
