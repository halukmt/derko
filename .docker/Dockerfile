FROM php:8.2-apache

# Enable Apache modules required by .htaccess
# mod_rewrite  → pretty URLs and 301 redirects
# mod_headers  → security headers (CSP, X-Frame-Options, COOP/COEP etc.)
# mod_expires  → Cache-Control / Expires headers for assets
RUN a2enmod rewrite headers expires

# msmtp: lightweight sendmail replacement that relays all PHP mail() calls to Mailpit
RUN apt-get update \
    && apt-get install -y --no-install-recommends msmtp \
    && rm -rf /var/lib/apt/lists/*

# GD extension: required by api/captcha.php to generate the math-challenge image.
# libpng-dev, libjpeg-dev, libfreetype6-dev are the native libraries GD compiles against.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpng-dev \
        libjpeg-dev \
        libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd \
    && rm -rf /var/lib/apt/lists/*

# Apache VirtualHost: AllowOverride All so .htaccess rewrites and headers are active
COPY apache.conf /etc/apache2/sites-available/000-default.conf

# PHP runtime config: routes mail() to msmtp, enables dev-friendly error reporting
COPY php.ini /usr/local/etc/php/conf.d/derko.ini

# msmtp config: relays to the "mailpit" Docker service on port 1025 (no TLS needed
# inside the private Docker network)
COPY msmtprc /etc/msmtprc
RUN chmod 644 /etc/msmtprc
