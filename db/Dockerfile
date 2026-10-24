# The official Liquibase image ships without the MySQL JDBC driver; installing it at build time
# keeps `docker compose up` independent from Maven downloads.
FROM liquibase/liquibase:4.33.0
RUN lpm add mysql --global
