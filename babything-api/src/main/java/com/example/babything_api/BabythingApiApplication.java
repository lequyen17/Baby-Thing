package com.example.babything_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BabythingApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(BabythingApiApplication.class, args);
	}

}
