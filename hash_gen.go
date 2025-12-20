package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	testtest, _ := bcrypt.GenerateFromPassword([]byte("testtest"), 12)
	adminadmin, _ := bcrypt.GenerateFromPassword([]byte("adminadmin"), 12)

	fmt.Println("testtest:", string(testtest))
	fmt.Println("adminadmin:", string(adminadmin))
}







