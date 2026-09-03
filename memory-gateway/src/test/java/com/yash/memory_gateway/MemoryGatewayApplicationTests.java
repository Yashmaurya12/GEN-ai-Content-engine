package com.yash.memory_gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = "memory.gateway.token=test-token")
class MemoryGatewayApplicationTests {

	@Test
	void contextLoads() {
	}

}
