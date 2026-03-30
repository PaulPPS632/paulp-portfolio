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
		const correoParaTi = resend.emails.send({
			from: fromEmail,
			to: [toEmail],
			replyTo: email,
			subject: `Portfolio contact from ${name}`,
			text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
			html: `<p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p>${safeMessage}</p>`
		});
		const correoParaVisitante = resend.emails.send({
			from: fromEmail, // Debe ser tu mismo correo verificado (ej. hola@paulp.dev)
			to: [email],     // Va dirigido al correo que el visitante escribió en el form
			subject: `He recibido tu mensaje - Paul`,
			text: `Hola ${name},\n\nEste es un mensaje automático para confirmar que he recibido tu contacto desde mi portafolio. Me pondré en contacto contigo a la brevedad.\n\nSaludos,\nPaul`,
			html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #111827; margin-top: 0;">¡Hola, ${safeName}!</h2>
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                Este es un mensaje automático para confirmar que he recibido tu contacto desde mi portafolio correctamente.
            </p>
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                Estaré revisando tu mensaje y me pondré en contacto contigo en las próximas 24 a 48 horas.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
                Mientras tanto, siéntete libre de explorar mis últimos proyectos en mi 
                <a href="TU_ENLACE_DE_GITHUB" style="color: #2563eb; text-decoration: none; font-weight: 500;">GitHub</a> o conectar conmigo en 
                <a href="TU_ENLACE_DE_LINKEDIN" style="color: #2563eb; text-decoration: none; font-weight: 500;">LinkedIn</a>.
            </p>
            
            <div style="margin-top: 30px;">
                <p style="color: #111827; font-weight: 600; margin: 0;">Saludos,</p>
                <p style="color: #4b5563; margin: 5px 0 0 0;">Paul</p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 4px;">Systems Engineer & Web Developer</p>
            </div>
        </div>
    `
		});
		await Promise.all([correoParaTi, correoParaVisitante]);
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
