export class NextResponse extends Response {
  static json(data: any, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init?.headers,
      },
    });
  }

  static redirect(url: string | URL, status: number = 307) {
    if (typeof window !== 'undefined') {
      window.location.href = url.toString();
    }
    return new Response(null, {
      status,
      headers: {
        location: url.toString(),
      },
    });
  }

  static next() {
    return new Response(null);
  }
}

export type NextRequest = Request;
