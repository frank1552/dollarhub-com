import { NextResponse } from 'next/server';
import { getAuthBaseUrl } from '@deriv/core';

interface TokenRequest {
  grant_type?: 'authorization_code' | 'refresh_token';
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
}

export async function POST(request: Request) {
  const clientId = process.env.NEXT_PUBLIC_DERIV_APP_ID;
  const registeredRedirectUri = process.env.NEXT_PUBLIC_DERIV_REDIRECT_URI;

  if (!clientId || !registeredRedirectUri) {
    return NextResponse.json({ error: 'Deriv OAuth is not configured' }, { status: 500 });
  }

  let body: TokenRequest;
  try {
    body = (await request.json()) as TokenRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (body.redirect_uri !== registeredRedirectUri) {
    return NextResponse.json({ error: 'Invalid redirect URI' }, { status: 400 });
  }

  if (body.grant_type === 'authorization_code' && (!body.code || !body.code_verifier)) {
    return NextResponse.json({ error: 'Missing authorization code or verifier' }, { status: 400 });
  }

  if (body.grant_type === 'refresh_token' && !body.refresh_token) {
    return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 });
  }

  const params = new URLSearchParams({
    grant_type: body.grant_type ?? 'authorization_code',
    client_id: clientId,
    redirect_uri: registeredRedirectUri,
  });

  if (body.code) params.set('code', body.code);
  if (body.code_verifier) params.set('code_verifier', body.code_verifier);
  if (body.refresh_token) params.set('refresh_token', body.refresh_token);

  const response = await fetch(`${getAuthBaseUrl()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const responseBody = await response.text();
  return new NextResponse(responseBody, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' },
  });
}